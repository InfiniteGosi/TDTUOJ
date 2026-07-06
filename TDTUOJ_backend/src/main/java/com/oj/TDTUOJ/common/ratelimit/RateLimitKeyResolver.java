package com.oj.TDTUOJ.common.ratelimit;

import com.oj.TDTUOJ.common.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Derives the bucket key that identifies "who" a request belongs to. Authenticated users are keyed
 * by stable user id (so limits follow them across IPs/devices); anonymous callers fall back to
 * client IP. Keys are prefixed ({@code rl:user:} / {@code rl:ip:}) to keep the two namespaces from
 * ever colliding.
 */
@Component
public class RateLimitKeyResolver {

    // Coarse sanity check for an IPv4 dotted-quad or IPv6 hex string. Purely a guard against using a
    // garbage/injected X-Forwarded-For value as a key — not a strict address validator.
    private static final Pattern VALID_IP = Pattern.compile(
            "^([0-9]{1,3}\\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$");

    public String resolve(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Prefer the authenticated user id — this is why the limiter must run AFTER AuthFilter.
        if (auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof AuthUser authUser) {
            return "rl:user:" + authUser.getUser().getId();
        }
        return "rl:ip:" + resolveIp(request);
    }

    public boolean isAuthenticated(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof AuthUser;
    }

    private String resolveIp(HttpServletRequest request) {
        // Behind a reverse proxy the real client IP is in X-Forwarded-For; take the first (leftmost)
        // entry, which is the original client. SECURITY: this header is client-spoofable, so it is
        // only trustworthy when a trusted proxy is guaranteed to set/overwrite it — otherwise an
        // attacker could rotate the value to dodge per-IP limits. Ignore it if it isn't IP-shaped.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String ip = forwarded.split(",")[0].trim();
            if (VALID_IP.matcher(ip).matches()) return ip;
        }
        // No usable forwarded header → use the direct socket address.
        return request.getRemoteAddr();
    }
}
