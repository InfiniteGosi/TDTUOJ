package com.oj.TDTUOJ.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**") // apply to all endpoints
                        .allowedOrigins("*") // allow requests from any domain
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE") // allow these HTTP methods
                        .allowedHeaders("*"); // allow all headers
            }
        };
    }
}

