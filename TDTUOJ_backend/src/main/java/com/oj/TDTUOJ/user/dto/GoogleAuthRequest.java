package com.oj.TDTUOJ.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Carries the Google-issued ID token from the client for server-side verification. */
@Data
public class GoogleAuthRequest {
    @NotBlank(message = "ID token is required")
    private String idToken;
}
