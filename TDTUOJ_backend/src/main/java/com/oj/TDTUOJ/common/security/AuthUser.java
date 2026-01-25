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

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isEnabled() {
        return user.getIsActive();
    }
}