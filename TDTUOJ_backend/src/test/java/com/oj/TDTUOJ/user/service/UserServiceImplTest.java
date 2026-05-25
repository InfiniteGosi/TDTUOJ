package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.repository.RatingHistoryRepository;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.user.dto.ChangePasswordRequest;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ModelMapper modelMapper;

    @Mock
    private AwsS3Service awsS3Service;

    @Mock
    private RatingHistoryRepository ratingHistoryRepository;

    @Mock
    private UserStatisticsRepository userStatisticsRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private void authenticateAs(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, "n/a"));
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getUserById_Success() {
        // given
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        UserDTO userDTO = new UserDTO();
        userDTO.setId(userId);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(modelMapper.map(user, UserDTO.class))
                .thenReturn(userDTO);

        // when
        Response<UserDTO> response = userService.getUserById(userId);

        // then
        assertNotNull(response);
        assertEquals(HttpStatus.OK.value(), response.getStatusCode());
        assertEquals("User retrieved successfully", response.getMessage());
        assertEquals(userDTO, response.getData());

        verify(userRepository).findById(userId);
        verify(modelMapper).map(user, UserDTO.class);
    }

    @Test
    void getUserById_UserNotFound_ThrowsNotFoundException() {
        // given
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // when + then
        NotFoundException exception = assertThrows(NotFoundException.class, () -> userService.getUserById(userId));
        assertEquals("User not found", exception.getMessage());

        verify(userRepository, times(1)).findById(userId);
        verify(modelMapper, never()).map(any(), any());
    }

    @Test
    void getUserById_WithNullUserId_ThrowsException() {
        assertThrows(Exception.class, () -> userService.getUserById(null));
    }

    @Test
    void changePassword_Success() {
        // given
        authenticateAs("u@a.com");
        User user = new User();
        user.setEmail("u@a.com");
        user.setPassword("ENC_OLD");

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("old123");
        req.setNewPassword("newPass1");
        req.setConfirmPassword("newPass1");

        when(userRepository.findByEmail("u@a.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old123", "ENC_OLD")).thenReturn(true);
        when(passwordEncoder.matches("newPass1", "ENC_OLD")).thenReturn(false);
        when(passwordEncoder.encode("newPass1")).thenReturn("ENC_NEW");

        // when
        Response<?> resp = userService.changePassword(req);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("Password changed successfully", resp.getMessage());
        assertEquals("ENC_NEW", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_WrongOldPassword_ThrowsBadRequest() {
        // given
        authenticateAs("u@a.com");
        User user = new User();
        user.setEmail("u@a.com");
        user.setPassword("ENC_OLD");

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("wrong");
        req.setNewPassword("newPass1");
        req.setConfirmPassword("newPass1");

        when(userRepository.findByEmail("u@a.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "ENC_OLD")).thenReturn(false);

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.changePassword(req));
        assertEquals("Current password is incorrect", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_MismatchConfirm_ThrowsBadRequest() {
        // given
        authenticateAs("u@a.com");
        User user = new User();
        user.setEmail("u@a.com");
        user.setPassword("ENC_OLD");

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("old123");
        req.setNewPassword("newA");
        req.setConfirmPassword("newB");

        when(userRepository.findByEmail("u@a.com")).thenReturn(Optional.of(user));

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.changePassword(req));
        assertEquals("New passwords do not match", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateOwnAccount_Success_UpdatesNameAndAbout() {
        // given
        authenticateAs("u@a.com");
        User user = new User();
        user.setEmail("u@a.com");
        user.setName("Old");
        user.setAbout("Old about");

        UserDTO dto = new UserDTO();
        dto.setName("New Name");
        dto.setAbout("New about");

        when(userRepository.findByEmail("u@a.com")).thenReturn(Optional.of(user));

        // when
        Response<?> resp = userService.updateOwnAccount(dto);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("Account updated successfully", resp.getMessage());
        assertEquals("New Name", user.getName());
        assertEquals("New about", user.getAbout());
        assertNotNull(user.getUpdatedAt());
        verify(userRepository).save(user);
        verifyNoInteractions(awsS3Service);
    }

    @Test
    void updateUserAsAdmin_EmailTaken_ThrowsBadRequest() {
        // given
        User existing = new User();
        existing.setId(1L);
        existing.setEmail("old@a.com");

        UserDTO dto = new UserDTO();
        dto.setId(1L);
        dto.setEmail("taken@a.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmail("taken@a.com")).thenReturn(true);

        // when + then
        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.updateUserAsAdmin(dto));
        assertEquals("Email already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void getAllUsers_PaginationMetaPopulated() {
        // given
        User u1 = new User();
        u1.setId(10L);
        UserDTO d1 = new UserDTO();
        d1.setId(10L);

        Page<User> page = new PageImpl<>(List.of(u1));
        when(userRepository.findAll(any(Pageable.class))).thenReturn(page);
        when(userStatisticsRepository.findAllByUserIdIn(anyList())).thenReturn(Collections.<UserStatistics>emptyList());
        when(modelMapper.map(u1, UserDTO.class)).thenReturn(d1);

        // when
        Response<Page<UserDTO>> resp = userService.getAllUsers(20, 0, "id", "asc", null);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("Users retrieved successfully", resp.getMessage());
        Page<UserDTO> data = resp.getData();
        assertEquals(1, data.getTotalElements());
        assertEquals(d1, data.getContent().get(0));
        verify(userRepository).findAll(any(Pageable.class));
    }

    @Test
    void getAllUsers_WithUsernameFilter_UsesContainingQuery() {
        // given
        Page<User> empty = new PageImpl<>(Collections.<User>emptyList());
        when(userRepository.findByUsernameContainingIgnoreCase(eq("ab"), any(Pageable.class)))
                .thenReturn(empty);
        when(userStatisticsRepository.findAllByUserIdIn(anyList())).thenReturn(Collections.<UserStatistics>emptyList());

        // when
        Response<Page<UserDTO>> resp = userService.getAllUsers(10, 0, "id", "asc", "ab");

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(userRepository).findByUsernameContainingIgnoreCase(eq("ab"), any(Pageable.class));
        verify(userRepository, never()).findAll(any(Pageable.class));
    }

}
