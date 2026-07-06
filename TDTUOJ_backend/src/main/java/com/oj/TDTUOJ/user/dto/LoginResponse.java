package com.oj.TDTUOJ.user.dto;

import lombok.Data;

import java.util.List;

/** Successful-login payload: the JWT plus the user's role names (used by the client to gate UI). */
@Data
public class LoginResponse {
    private String token;
    private List<String> roles;
}
