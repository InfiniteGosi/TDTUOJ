package com.oj.TDTUOJ.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    @NotBlank(message = "ID token is required")
    private String idToken;
}
