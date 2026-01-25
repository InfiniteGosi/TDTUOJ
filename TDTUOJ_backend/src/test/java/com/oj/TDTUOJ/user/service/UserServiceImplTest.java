package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
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

    @InjectMocks
    private UserServiceImpl userService;


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
}