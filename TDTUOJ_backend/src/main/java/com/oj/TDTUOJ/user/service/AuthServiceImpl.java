package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.common.security.JwtUtils;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RoleRepository roleRepository;

    @Override
    public Response<?> register(RegistrationRequest registrationRequest) {
        // Reject if username already exists
        if (userRepository.existsByUsername(registrationRequest.getUsername())) {
            throw new BadRequestException("Username already exists");
        }

        // Reject if email already exists
        if (userRepository.existsByEmail(registrationRequest.getEmail())) {
            throw new BadRequestException("Email already exists");
        }
        
        // Collect roles from request, or fallback to PARTICIPANT role
        Set<Role> userRoles;
        if (registrationRequest.getRoles() != null && !registrationRequest.getRoles().isEmpty()) {
            userRoles = registrationRequest.getRoles().stream()
                    .map(roleName -> roleRepository.findByName(roleName.toUpperCase())
                            .orElseThrow(() -> new NotFoundException("Role with name: " + roleName + " not found")))
                    .collect(Collectors.toSet());
        } else {
            // Default role assignment when none provided
            Role defaultRole = roleRepository.findByName("PARTICIPANT")
                    .orElseThrow(() -> new NotFoundException("PARTICIPANT role not found"));
            Set<Role> roles = new HashSet<>();
            roles.add(defaultRole);
            userRoles = roles;
        }

        // Build User entity with encoded password and default values
        User user = User.builder()
                .username(registrationRequest.getUsername())
                .password(passwordEncoder.encode(registrationRequest.getPassword()))
                .email(registrationRequest.getEmail())
                .roles(userRoles)
                .isActive(true)
                .point(0)
                .rating(0)
                .build();

        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("User registered successfully")
                .build();
    }

    @Override
    public Response<LoginResponse> login(LoginRequest loginRequest) {
        // Step 1: Find user by email or fail
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new NotFoundException("Email not found"));

        // Step 2: Ensure account is active
        if (!user.getIsActive()) {
            throw new NotFoundException("User not active, please contact customer support");
        }

        // Step 3: Verify password
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new BadRequestException("Wrong password");
        }

        // Step 4: Generate a JWT token
        String token = jwtUtils.generateToken(user.getEmail());

        // Step 5: Extract role names
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        // Build login response DTO
        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(token);
        loginResponse.setRoles(roleNames);

        return Response.<LoginResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Login successful")
                .data(loginResponse)
                .build();
    }
}
