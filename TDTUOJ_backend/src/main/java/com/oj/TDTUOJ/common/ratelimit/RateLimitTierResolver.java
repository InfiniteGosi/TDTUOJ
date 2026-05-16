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

@Component
@RequiredArgsConstructor
public class RateLimitTierResolver {

    private final RateLimitProperties properties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Lazy
    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;

    public String resolve(HttpServletRequest request) {
        // Annotation on handler method takes highest priority
        try {
            HandlerExecutionChain chain = requestMappingHandlerMapping.getHandler(request);
            if (chain != null && chain.getHandler() instanceof HandlerMethod handlerMethod) {
                RateLimit annotation = handlerMethod.getMethodAnnotation(RateLimit.class);
                if (annotation != null) return annotation.tier();
            }
        } catch (Exception ignored) {}

        // Path + method pattern matching (skip 'default' — it's the fallback)
        String method = request.getMethod();
        String path = request.getRequestURI();

        for (Map.Entry<String, TierConfig> entry : properties.getTiers().entrySet()) {
            String tierName = entry.getKey();
            if ("default".equals(tierName)) continue;
            TierConfig config = entry.getValue();
            if (config.getPaths() == null || config.getPaths().isEmpty()) continue;
            for (PathRule rule : config.getPaths()) {
                boolean methodMatches = "*".equals(rule.getMethod())
                        || method.equalsIgnoreCase(rule.getMethod());
                if (methodMatches && pathMatcher.match(rule.getPattern(), path)) {
                    return tierName;
                }
            }
        }

        return "default";
    }
}
