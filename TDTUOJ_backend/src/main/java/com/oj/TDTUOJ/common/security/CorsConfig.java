package com.oj.TDTUOJ.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS policy. This is intentionally permissive (any origin) because the API is a public,
 * token-authenticated service consumed by browser clients — auth rides in the Authorization header,
 * not cookies. Note: a wildcard origin is only valid <em>because</em> credentials (cookies) are not
 * allowed; enabling allowCredentials(true) here would require an explicit origin list instead.
 */
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**") // apply to all endpoints
                        .allowedOrigins("*") // allow requests from any domain (no cookies → wildcard is safe)
                        // OPTIONS is auto-handled by the preflight machinery, so it is not listed here.
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE") // allow these HTTP methods
                        .allowedHeaders("*"); // allow all headers
            }
        };
    }
}

