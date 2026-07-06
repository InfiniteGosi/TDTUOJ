package com.oj.TDTUOJ.user.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.GoogleAuthRequest;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;
import com.oj.TDTUOJ.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public authentication endpoints (registration and login). Mapped under
 * {@code /api/auth/**}, which SecurityConfig permits without a token.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    /** Register a new local account. {@code @Valid} enforces the DTO's field constraints before the service runs. */
    @PostMapping("/register")
    public ResponseEntity<Response<?>> register(@RequestBody @Valid RegistrationRequest registrationRequest) {
        return ResponseEntity.ok(authService.register(registrationRequest));
    }

    /** Email/password login; returns a JWT plus the user's role names on success. */
    @PostMapping("/login")
    public ResponseEntity<Response<LoginResponse>> login(@RequestBody @Valid LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    /** Google Sign-In: exchanges a Google ID token for our own JWT (auto-registers on first use). */
    @PostMapping("/google")
    public ResponseEntity<Response<LoginResponse>> loginWithGoogle(@RequestBody @Valid GoogleAuthRequest googleAuthRequest) {
        return ResponseEntity.ok(authService.loginWithGoogle(googleAuthRequest));
    }
}
