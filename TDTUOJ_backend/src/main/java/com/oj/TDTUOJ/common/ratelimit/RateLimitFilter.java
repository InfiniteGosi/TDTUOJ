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
        if (!properties.isEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        if (properties.isAdminBypass() && isAdmin()) {
            chain.doFilter(request, response);
            return;
        }

        boolean authenticated = keyResolver.isAuthenticated(request);
        String key = keyResolver.resolve(request);
        String tier = tierResolver.resolve(request);

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
            ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

            if (probe.isConsumed()) {
                response.addHeader("X-RateLimit-Limit", String.valueOf(capacity));
                response.addHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
                response.addHeader("X-RateLimit-Tier", tier);
                metrics.recordAllowed(tier);
                chain.doFilter(request, response);
            } else {
                long retryAfter = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1;
                metrics.recordDenied(tier);
                rejectWithTooManyRequests(response, tier, capacity, retryAfter);
            }
        } catch (RedisException e) {
            log.warn("Rate limiter Redis error, failing open: {}", e.getMessage());
            metrics.recordRedisError();
            chain.doFilter(request, response);
        }
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ADMIN".equals(a.getAuthority()));
    }

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
