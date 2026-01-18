package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;

public interface AuthService {
    Response<?> register(RegistrationRequest registrationRequest);
    Response<LoginResponse> login(LoginRequest loginRequest);
}
