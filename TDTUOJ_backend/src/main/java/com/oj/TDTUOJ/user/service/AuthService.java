package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.GoogleAuthRequest;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;

/** Authentication use cases: local registration/login and Google Sign-In exchange. */
public interface AuthService {
    Response<?> register(RegistrationRequest registrationRequest);
    Response<LoginResponse> login(LoginRequest loginRequest);
    Response<LoginResponse> loginWithGoogle(GoogleAuthRequest googleAuthRequest);
}
