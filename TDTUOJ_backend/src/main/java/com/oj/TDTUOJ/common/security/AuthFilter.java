package com.oj.TDTUOJ.common.security;

import com.oj.TDTUOJ.common.exceptions.CustomAuthenticationEntryPoint;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter that runs exactly once per request (via {@link OncePerRequestFilter}).
 * <p>
 * Registered {@code addFilterBefore(UsernamePasswordAuthenticationFilter)} in {@code SecurityConfig},
 * so it populates the {@link SecurityContextHolder} before any downstream authorization checks
 * (and before the rate-limit filter, which reads the resolved principal to pick a tier).
 * <p>
 * Design decisions worth noting:
 * <ul>
 *   <li>A <em>missing</em> token is not an error — the request simply proceeds unauthenticated so
 *       that public endpoints keep working. Only a <em>malformed/invalid</em> token short-circuits
 *       with a 401 via the entry point.</li>
 *   <li>Authentication is stateless: nothing is stored server-side, the context is rebuilt per request.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthFilter extends OncePerRequestFilter {
    // Helper to generate/validate JWTs
    private final JwtUtils jwtUtils;

    // Service to load users from DB and wrap them in AuthUser
    private final CustomUserDetailsService customUserDetailsService;

    // Handles what happens when authentication fails
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;

    /**
     * Main filter logic: runs on every request before hitting controller.
     * Checks JWT token from the Authorization header and sets authentication in context.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Extract JWT token from Authorization header
        String token = getTokenFromRequest(request);

        if (token != null) {
            String email;

            try {
                // Try to extract email (subject) from token
                email = jwtUtils.getUserNameFromToken(token);
            }
            catch (Exception ex) {
                // If token parsing fails -> reject request with 401
                AuthenticationException authenticationException = new BadCredentialsException(ex.getMessage());
                customAuthenticationEntryPoint.commence(request, response, authenticationException);
                return; // Stop filter chain execution
            }

            // Load user details from DB by email. The signature was already cryptographically
            // verified while extracting the subject above, so this lookup is on a trusted email.
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);

            // Only trust the token if the subject still matches the loaded user AND it hasn't expired.
            // Authorities come from the freshly-loaded user, so role changes take effect on next request.
            if (StringUtils.hasText(email) && jwtUtils.isTokenValid(token, userDetails)) {
                // Create authentication token with user's authorities
                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                // Attach request details (IP, session ID, etc.)
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Save authentication in SecurityContext so controllers know the user is authenticated
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
        }

        try {
            // Continue with the next filter in the chain
            filterChain.doFilter(request, response);
        }
        catch (Exception ex) {
            // Downstream errors are logged but intentionally swallowed here so this auth filter
            // never turns an unrelated controller failure into an auth-layer crash. The response
            // has usually already been (partially) committed by the time control returns.
            log.error(ex.getMessage());
        }
    }

    /**
     * Extracts the JWT token from the "Authorization" header.
     * Expected format: "Bearer <token>".
     *
     * @param request incoming HTTP request
     * @return the token without "Bearer " prefix, or null if missing
     */
    private String getTokenFromRequest(HttpServletRequest request) {
        String tokenWithBearer = request.getHeader("Authorization");
        if (tokenWithBearer != null && tokenWithBearer.startsWith("Bearer ")) {
            // Remove "Bearer " prefix (7 characters)
            return tokenWithBearer.substring(7);
        }
        return null;
    }
}