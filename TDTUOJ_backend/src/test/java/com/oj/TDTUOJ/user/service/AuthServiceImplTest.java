package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.common.security.JwtUtils;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.user.dto.LoginRequest;
import com.oj.TDTUOJ.user.dto.LoginResponse;
import com.oj.TDTUOJ.user.dto.RegistrationRequest;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtils jwtUtils;
    @Mock private RoleRepository roleRepository;

    @InjectMocks private AuthServiceImpl authService;

    private RegistrationRequest reg(String u, String e, String p) {
        RegistrationRequest r = new RegistrationRequest();
        r.setUsername(u);
        r.setEmail(e);
        r.setPassword(p);
        return r;
    }

    @Test
    void register_Success() {
        // given
        RegistrationRequest req = reg("alice", "a@a.com", "pw");
        Role participant = new Role();
        participant.setName("PARTICIPANT");
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("a@a.com")).thenReturn(false);
        when(roleRepository.findByName("PARTICIPANT")).thenReturn(Optional.of(participant));
        when(passwordEncoder.encode("pw")).thenReturn("ENC");

        // when
        Response<?> resp = authService.register(req);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("User registered successfully", resp.getMessage());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("alice", saved.getUsername());
        assertEquals("a@a.com", saved.getEmail());
        assertEquals("ENC", saved.getPassword());
        assertTrue(saved.getIsActive());
        assertTrue(saved.getRoles().contains(participant));
    }

    @Test
    void register_DuplicateUsername_ThrowsBadRequest() {
        // given
        RegistrationRequest req = reg("alice", "a@a.com", "pw");
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(req));
        assertEquals("Username already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_DuplicateEmail_ThrowsBadRequest() {
        // given
        RegistrationRequest req = reg("alice", "a@a.com", "pw");
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("a@a.com")).thenReturn(true);

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(req));
        assertEquals("Email already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_DefaultRoleMissing_ThrowsNotFound() {
        // given
        RegistrationRequest req = reg("alice", "a@a.com", "pw");
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("a@a.com")).thenReturn(false);
        when(roleRepository.findByName("PARTICIPANT")).thenReturn(Optional.empty());

        // when + then
        NotFoundException ex = assertThrows(NotFoundException.class, () -> authService.register(req));
        assertEquals("PARTICIPANT role not found", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_Success() {
        // given
        LoginRequest req = new LoginRequest();
        req.setEmail("a@a.com");
        req.setPassword("pw");

        Role role = new Role();
        role.setName("PARTICIPANT");
        Set<Role> roles = new HashSet<>();
        roles.add(role);

        User user = new User();
        user.setEmail("a@a.com");
        user.setPassword("ENC");
        user.setIsActive(true);
        user.setRoles(roles);

        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pw", "ENC")).thenReturn(true);
        when(jwtUtils.generateToken("a@a.com")).thenReturn("JWT");

        // when
        Response<LoginResponse> resp = authService.login(req);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("Login successful", resp.getMessage());
        assertEquals("JWT", resp.getData().getToken());
        assertTrue(resp.getData().getRoles().contains("PARTICIPANT"));
        verify(jwtUtils).generateToken("a@a.com");
    }

    @Test
    void login_WrongPassword_ThrowsUnauthorized() {
        // given
        LoginRequest req = new LoginRequest();
        req.setEmail("a@a.com");
        req.setPassword("bad");
        User user = new User();
        user.setEmail("a@a.com");
        user.setPassword("ENC");
        user.setIsActive(true);
        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad", "ENC")).thenReturn(false);

        // when + then
        UnauthorizedAccessException ex = assertThrows(UnauthorizedAccessException.class, () -> authService.login(req));
        assertEquals("Invalid email or password", ex.getMessage());
        verify(jwtUtils, never()).generateToken(any());
    }

    @Test
    void login_UnknownUser_ThrowsUnauthorized() {
        // given
        LoginRequest req = new LoginRequest();
        req.setEmail("missing@a.com");
        req.setPassword("pw");
        when(userRepository.findByEmail("missing@a.com")).thenReturn(Optional.empty());

        // when + then
        UnauthorizedAccessException ex = assertThrows(UnauthorizedAccessException.class, () -> authService.login(req));
        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void login_InactiveUser_ThrowsBadRequest() {
        // given
        LoginRequest req = new LoginRequest();
        req.setEmail("a@a.com");
        req.setPassword("pw");
        User user = new User();
        user.setEmail("a@a.com");
        user.setPassword("ENC");
        user.setIsActive(false);
        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(req));
        assertEquals("User not active, please contact customer support", ex.getMessage());
        verify(jwtUtils, never()).generateToken(any());
    }
}