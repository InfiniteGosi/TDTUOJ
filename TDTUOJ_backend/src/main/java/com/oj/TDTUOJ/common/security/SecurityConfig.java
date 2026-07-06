package com.oj.TDTUOJ.common.security;

import com.oj.TDTUOJ.common.exceptions.CustomAccessDenialHandler;
import com.oj.TDTUOJ.common.exceptions.CustomAuthenticationEntryPoint;
import com.oj.TDTUOJ.common.ratelimit.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Central Spring Security configuration for the stateless JWT-based API.
 * <p>
 * Key architectural choices: no server sessions (every request re-authenticates from its token),
 * CSRF disabled (safe because auth is a bearer token, not a cookie), and coarse URL allow-listing
 * backed by finer {@code @PreAuthorize} method security enabled via {@link EnableMethodSecurity}.
 */
@Configuration
@EnableWebSecurity   // Enables Spring Security’s web security support
@EnableMethodSecurity // Enables method-level security annotations (@PreAuthorize, etc.)
@RequiredArgsConstructor
public class SecurityConfig {

    private final AuthFilter authFilter;
    private final RateLimitFilter rateLimitFilter;
    private final CustomAccessDenialHandler customAccessDenialHandler;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;

    /**
     * Main security configuration method.
     * Defines authentication rules, filter chain, and session handling.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF since JWT is used (stateless authentication, no CSRF tokens needed)
                .csrf(AbstractHttpConfigurer::disable)

                // Enable Cross-Origin Resource Sharing with default settings
                .cors(Customizer.withDefaults())

                // Configure exception handling (401 Unauthorized, 403 Forbidden)
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler(customAccessDenialHandler)       // handles 403 errors
                        .authenticationEntryPoint(customAuthenticationEntryPoint)) // handles 401 errors

                // Define authorization rules
                .authorizeHttpRequests(req -> req
                        // Public endpoints (accessible without authentication)
                        .requestMatchers("/api/auth/**",
                                "/api/problems/**",
                                "/api/users/**",
                                "/api/contests/**",
                                "/api/organizations/**",
                                "/api/status/**",
                                "/api/files/**",
                                // Only the aggregate submission counter is public; every other
                                // /api/submissions/** route stays authenticated.
                                "/api/submissions/count",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/actuator/**").permitAll()
                        // All other endpoints require authentication
                        .anyRequest().authenticated())

                // Configure session management → stateless (no sessions stored on server)
                .sessionManagement(man -> man.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Filter ordering is deliberate: authFilter runs first (before Spring's
                // username/password filter) to populate the SecurityContext, then rateLimitFilter
                // runs immediately after it. Placing the limiter *after* auth means it can key
                // buckets on the resolved user id (not just IP) and honour the admin bypass.
                .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, AuthFilter.class);

        return http.build();
    }

    /**
     * Disables the automatic servlet-container registration of {@link RateLimitFilter}.
     * <p>
     * Because it is a {@code @Component} extending {@code OncePerRequestFilter}, Spring Boot would
     * otherwise register it a second time directly on the servlet context — causing it to run twice
     * (once outside the security chain, once inside) and double-count tokens. Setting the
     * registration disabled leaves only the copy wired into the security filter chain above.
     */
    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter filter) {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Password encoder bean.
     * BCrypt is a secure hashing algorithm for storing passwords.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Expose AuthenticationManager as a Spring bean.
     * Used to authenticate users manually (e.g., in login service).
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
