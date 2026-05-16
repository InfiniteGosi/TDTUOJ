package com.oj.TDTUOJ.common.ratelimit;

import com.oj.TDTUOJ.common.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class RateLimitKeyResolver {

    private static final Pattern VALID_IP = Pattern.compile(
            "^([0-9]{1,3}\\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$");

    public String resolve(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
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
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String ip = forwarded.split(",")[0].trim();
            if (VALID_IP.matcher(ip).matches()) return ip;
        }
        return request.getRemoteAddr();
    }
}
