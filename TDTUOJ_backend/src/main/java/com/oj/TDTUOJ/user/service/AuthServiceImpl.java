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

/**
 * Authentication service: local registration/login and Google Sign-In.
 * Passwords are stored only as BCrypt hashes (via {@link PasswordEncoder}), and
 * a successful auth yields a JWT minted from the user's email.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RoleRepository roleRepository;

    // Expected audience for verifying Google ID tokens; injected from config.
    @Value("${google.client.id}")
    private String googleClientId;

    /**
     * Register a new local account: enforces unique username/email, resolves the
     * requested roles (or defaults to PARTICIPANT), and persists the user with a
     * BCrypt-hashed password.
     */
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

        // Build User entity; the raw password is BCrypt-hashed here so plaintext is never persisted.
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

    /**
     * Local email/password login. Returns a JWT and role names on success.
     * Uses the same generic "Invalid email or password" message for both unknown
     * email and wrong password so the response can't be used to enumerate accounts.
     */
    @Override
    public Response<LoginResponse> login(LoginRequest loginRequest) {
        // Step 1: Find user by email or fail
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new UnauthorizedAccessException("Invalid email or password"));

        // Step 2: Ensure account is active
        if (!user.getIsActive()) {
            throw new BadRequestException("User not active, please contact customer support");
        }

        // Step 3: Verify password by hashing the input and comparing to the stored BCrypt hash.
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

    /**
     * Google Sign-In. Verifies the client-supplied ID token against our client id,
     * then finds-or-creates the matching account and issues our own JWT. First-time
     * Google users are auto-registered; pre-existing LOCAL accounts with the same
     * email are transparently linked to the Google provider.
     */
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
            // Malformed token or transport failure during verification.
            throw new BadRequestException("Invalid Google ID token: " + e.getMessage());
        }

        // verify() returns null (rather than throwing) when signature/audience/expiry checks fail.
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
            // New user — auto-register. Derive a username from the email local-part,
            // sanitizing to the allowed charset, then append an incrementing suffix
            // until it's unique (username has a UNIQUE constraint).
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
                    .password(null) // Google-only account: no local password exists
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
            // Same email registered locally: link it to Google so future Google
            // logins resolve to this account. Only backfill the avatar if none is set,
            // to avoid overwriting a picture the user chose themselves.
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
