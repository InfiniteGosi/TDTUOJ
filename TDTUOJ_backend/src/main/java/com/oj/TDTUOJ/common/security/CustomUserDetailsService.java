package com.oj.TDTUOJ.common.security;

// CustomUserDetailsService loads your domain User from the DB.
// AuthUser adapts the entity into a Spring Security-friendly UserDetails.

import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Bridges the persistence layer to Spring Security. Called on every authenticated request by
 * {@code AuthFilter} to resolve the token subject into a live {@link UserDetails}.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    /**
     * Loads a user by their email address (the value Spring Security calls the "username").
     *
     * @param username the user's email (JWT subject / login identifier)
     * @return the user wrapped as an {@link AuthUser}
     * @throws UsernameNotFoundException if no user has that email
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // "username" is really the email here — see AuthUser#getUsername.
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return AuthUser.builder()
                .user(user)
                .build();
    }
}
