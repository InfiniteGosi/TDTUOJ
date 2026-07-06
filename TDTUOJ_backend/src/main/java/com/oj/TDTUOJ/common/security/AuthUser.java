package com.oj.TDTUOJ.common.security;

// This class is a Spring Security wrapper around your own User entity
// so that it can integrate with Spring Security’s authentication system.

import com.oj.TDTUOJ.user.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * Adapter that presents the domain {@link User} entity as a Spring Security {@link UserDetails}.
 * Wrapping the entity (rather than mapping to a DTO) keeps the full user available downstream —
 * e.g. the rate limiter reads {@code getUser().getId()} off the authenticated principal.
 */
@Data
@Builder
public class AuthUser implements UserDetails {

    private User user;

    // Converts your User’s roles into GrantedAuthority objects (ROLE_ADMIN, ROLE_USER, etc.),
    // which Spring Security understands.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles()
                .stream()
                .map(role -> new SimpleGrantedAuthority(role.getName()))
                .toList();
    }

    // Google-OAuth accounts have no local password; return "" instead of null so Spring Security's
    // UserDetails contract (non-null password) is satisfied. Such accounts can never match a
    // BCrypt-hashed password, so form login for them effectively fails closed.
    @Override
    public String getPassword() {
        return user.getPassword() != null ? user.getPassword() : "";
    }

    // Email is the canonical login identifier / JWT subject, not the display username.
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    // Deactivated users (isActive == false) are treated as disabled and rejected at authentication.
    @Override
    public boolean isEnabled() {
        return user.getIsActive();
    }
}