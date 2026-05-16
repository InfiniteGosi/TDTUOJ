package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.common.security.JwtUtils;
import com.oj.TDTUOJ.user.dto.GoogleAuthRequest;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
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

    @Value("${google.client.id}")
    private String googleClientId;

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
                .build();

        user.setCreatedAt(LocalDateTime.now());
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
                .orElseThrow(() -> new UnauthorizedAccessException("Invalid email or password"));

        // Step 2: Ensure account is active
        if (!user.getIsActive()) {
            throw new BadRequestException("User not active, please contact customer support");
        }

        // Step 3: Verify password
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new UnauthorizedAccessException("Invalid email or password");
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

    @Override
    public Response<LoginResponse> loginWithGoogle(GoogleAuthRequest googleAuthRequest) {
        // Step 1: Verify Google ID token server-side
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(googleAuthRequest.getIdToken());
        } catch (Exception e) {
            throw new BadRequestException("Invalid Google ID token: " + e.getMessage());
        }

        if (idToken == null) {
            throw new BadRequestException("Invalid Google ID token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String googleId = payload.getSubject();
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        // Step 2: Find or create user
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // New user — auto-register with derived username
            String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9_-]", "_");
            String username = baseUsername;
            int suffix = 1;
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + suffix;
                suffix++;
            }

            Role defaultRole = roleRepository.findByName("PARTICIPANT")
                    .orElseThrow(() -> new NotFoundException("PARTICIPANT role not found"));

            user = User.builder()
                    .username(username)
                    .email(email)
                    .name(name)
                    .password(null)
                    .authProvider("GOOGLE")
                    .providerId(googleId)
                    .profileUrl(pictureUrl)
                    .roles(new HashSet<>(Set.of(defaultRole)))
                    .isActive(true)
                    .build();
            user.setCreatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("New Google user registered: {}", email);
        } else {
            // Existing user — check active status first
            if (!user.getIsActive()) {
                throw new BadRequestException("User not active, please contact customer support");
            }
            // Auto-link if previously LOCAL
            if ("LOCAL".equals(user.getAuthProvider())) {
                user.setAuthProvider("GOOGLE");
                user.setProviderId(googleId);
                if (user.getProfileUrl() == null && pictureUrl != null) {
                    user.setProfileUrl(pictureUrl);
                }
                userRepository.save(user);
                log.info("Linked existing LOCAL user to Google: {}", email);
            }
        }

        // Step 3: Generate JWT and return
        String token = jwtUtils.generateToken(user.getEmail());
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(token);
        loginResponse.setRoles(roleNames);

        return Response.<LoginResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Google login successful")
                .data(loginResponse)
                .build();
    }
}
