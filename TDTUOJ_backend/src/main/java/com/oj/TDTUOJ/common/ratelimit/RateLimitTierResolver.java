package com.oj.TDTUOJ.common.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Map;

/**
 * Determines which rate-limit tier applies to a request. Resolution order (first match wins):
 * <ol>
 *   <li>an explicit {@link RateLimit} annotation on the target handler method,</li>
 *   <li>the first configured path+method rule that matches, then</li>
 *   <li>the {@code "default"} tier as a catch-all.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class RateLimitTierResolver {

    private final RateLimitProperties properties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // @Lazy breaks a startup circular dependency: this bean sits in the security filter chain, while
    // RequestMappingHandlerMapping is part of MVC init — deferring the wiring avoids a bootstrap cycle.
    @Lazy
    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;

    public String resolve(HttpServletRequest request) {
        // (1) A @RateLimit annotation on the handler method is the most specific signal, so it wins.
        try {
            HandlerExecutionChain chain = requestMappingHandlerMapping.getHandler(request);
            if (chain != null && chain.getHandler() instanceof HandlerMethod handlerMethod) {
                RateLimit annotation = handlerMethod.getMethodAnnotation(RateLimit.class);
                if (annotation != null) return annotation.tier();
            }
        } catch (Exception ignored) {
            // Handler lookup can throw for unmapped/error paths; ignore and fall through to path rules.
        }

        // Path + method pattern matching (skip 'default' — it's the fallback)
        String method = request.getMethod();
        String path = request.getRequestURI();

        // (2) Iterate configured tiers in declaration order (LinkedHashMap preserves it), so the
        // first matching rule wins — order tiers most-specific-first in config. "default" is skipped
        // here because it is the fallback, not a path rule.
        for (Map.Entry<String, TierConfig> entry : properties.getTiers().entrySet()) {
            String tierName = entry.getKey();
            if ("default".equals(tierName)) continue;
            TierConfig config = entry.getValue();
            if (config.getPaths() == null || config.getPaths().isEmpty()) continue;
            for (PathRule rule : config.getPaths()) {
                // "*" method acts as a wildcard; otherwise match case-insensitively (GET vs get).
                boolean methodMatches = "*".equals(rule.getMethod())
                        || method.equalsIgnoreCase(rule.getMethod());
                if (methodMatches && pathMatcher.match(rule.getPattern(), path)) {
                    return tierName;
                }
            }
        }

        // (3) Nothing matched — apply the shared default budget.
        return "default";
    }
}
