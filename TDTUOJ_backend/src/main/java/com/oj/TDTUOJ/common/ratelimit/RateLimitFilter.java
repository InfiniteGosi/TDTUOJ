package com.oj.TDTUOJ.common.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.response.Response;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.lettuce.core.RedisException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Token-bucket rate limiter, applied once per request after authentication (see filter ordering in
 * {@code SecurityConfig}). For each request it resolves a bucket key (per-user when authenticated,
 * else per-IP) and a tier (per-endpoint policy), then attempts to consume one token from the
 * Redis-backed bucket. On success it echoes {@code X-RateLimit-*} headers; on exhaustion it returns
 * HTTP 429 with a {@code Retry-After}.
 * <p>
 * Fail-open design: if Redis is unavailable the request is allowed through rather than blocked, so a
 * limiter outage degrades to "no limiting" instead of a full outage.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties properties;
    private final RateLimitKeyResolver keyResolver;
    private final RateLimitTierResolver tierResolver;
    private final BucketRegistry bucketRegistry;
    private final RateLimitMetrics metrics;
    private final ObjectMapper objectMapper;

    // Infra/observability endpoints are never rate-limited — Swagger, API docs and actuator probes
    // (health checks, metrics scrapes) must stay available even under heavy client traffic.
    private static final Set<String> EXCLUDED_PREFIXES = Set.of(
            "/swagger-ui", "/v3/api-docs", "/actuator"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return EXCLUDED_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        // Global kill-switch: lets the whole limiter be turned off via config without redeploying.
        if (!properties.isEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        // Optional escape hatch for admins (e.g. bulk operations, load testing) when configured on.
        if (properties.isAdminBypass() && isAdmin()) {
            chain.doFilter(request, response);
            return;
        }

        // Authenticated principals get a higher per-user allowance; anonymous callers are keyed by IP.
        boolean authenticated = keyResolver.isAuthenticated(request);
        String key = keyResolver.resolve(request);
        String tier = tierResolver.resolve(request);

        // Fall back to the "default" tier if the resolved tier name has no config, and to hardcoded
        // 120/60 limits if even "default" is missing — the limiter must still make a decision.
        TierConfig tierConfig = properties.getTiers().getOrDefault(tier,
                properties.getTiers().get("default"));
        long capacity = tierConfig != null
                ? (authenticated ? tierConfig.getAuthenticatedCapacity() : tierConfig.getCapacity())
                : (authenticated ? 120 : 60);

        // capacity == 0 means this tier blocks all requests for this principal type
        if (capacity <= 0) {
            metrics.recordDenied(tier);
            rejectWithTooManyRequests(response, tier, 0, 60);
            return;
        }

        try {
            Bucket bucket = bucketRegistry.getBucket(tier, key, authenticated);
            // Atomically try to take one token; the probe reports success plus remaining/refill info.
            ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

            if (probe.isConsumed()) {
                // Under budget: surface the client's current standing via standard rate-limit headers.
                response.addHeader("X-RateLimit-Limit", String.valueOf(capacity));
                response.addHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
                response.addHeader("X-RateLimit-Tier", tier);
                metrics.recordAllowed(tier);
                chain.doFilter(request, response);
            } else {
                // Over budget: convert nanos-until-refill to whole seconds, rounding UP (+1) so we
                // never tell the client to retry before at least one token has actually replenished.
                long retryAfter = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1;
                metrics.recordDenied(tier);
                rejectWithTooManyRequests(response, tier, capacity, retryAfter);
            }
        } catch (RedisException e) {
            // Fail open: if the bucket store is unreachable, allow the request rather than block all
            // traffic. Availability is prioritised over strict enforcement during a Redis outage.
            log.warn("Rate limiter Redis error, failing open: {}", e.getMessage());
            metrics.recordRedisError();
            chain.doFilter(request, response);
        }
    }

    /**
     * @return true if the current principal carries the raw {@code ADMIN} authority. Note the check
     *         is against {@code "ADMIN"} (not {@code "ROLE_ADMIN"}) to match how roles are stored.
     */
    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ADMIN".equals(a.getAuthority()));
    }

    /**
     * Writes a 429 Too Many Requests response with rate-limit headers and a JSON body. Sets
     * {@code Retry-After} (seconds) so well-behaved clients know when to back off.
     */
    private void rejectWithTooManyRequests(HttpServletResponse response, String tier,
                                            long limit, long retryAfterSecs) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.addHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.addHeader("X-RateLimit-Remaining", "0");
        response.addHeader("X-RateLimit-Tier", tier);
        response.addHeader("Retry-After", String.valueOf(retryAfterSecs));

        Response<Void> body = Response.<Void>builder()
                .statusCode(429)
                .message("Rate limit exceeded. Try again in " + retryAfterSecs + " seconds.")
                .build();
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
