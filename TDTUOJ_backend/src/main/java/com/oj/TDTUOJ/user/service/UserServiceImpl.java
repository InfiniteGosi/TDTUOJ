package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;
    private final AwsS3Service awsS3Service;

    @Override
    public User getCurrentLoggedInUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Override
    public Response<UserDTO> getOwnAccountDetails() {
        User user = getCurrentLoggedInUser();
        UserDTO userDTO = modelMapper.map(user, UserDTO.class);

        return Response.<UserDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Current user retrieved successfully")
                .data(userDTO)
                .build();
    }

    @Override
    public Response<?> updateOwnAccount(UserDTO userDTO) {
        return null;
    }

    @Override
    public Response<?> deactivateOwnAccount() {
        return null;
    }

    @Override
    public Response<?> updateUserAsAdmin(Long userId, UserDTO userDTO) {
        log.info("Inside update as admin");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (userDTO.getName() != null) user.setName(userDTO.getName());
        if (userDTO.getIsActive() != null) user.setIsActive(userDTO.getIsActive());

        // Update password if provided
        if (userDTO.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Update email if changed
        if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(userDTO.getEmail());
        }


        // Update roles (admin can change roles)
        Set<Role> userRoles;
        if (userDTO.getRoles() != null && !userDTO.getRoles().isEmpty()) {
            userRoles = userDTO.getRoles().stream()
                    .map(roleDTO -> roleRepository.findByName(roleDTO.getName().toUpperCase())
                            .orElseThrow(() -> new NotFoundException("Role with name: " + roleDTO.getName().toUpperCase() + " not found")))
                    .collect(Collectors.toSet());
        } else {
            // Default role assignment when none provided
            Role defaultRole = roleRepository.findByName("PARTICIPANT")
                    .orElseThrow(() -> new NotFoundException("PARTICIPANT role not found"));
            Set<Role> roles = new HashSet<>();
            roles.add(defaultRole);
            userRoles = roles;
        }

        user.setRoles(userRoles);
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("User updated successfully by admin")
                .build();
    }

    @Override
    public Response<UserDTO> getUserById(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        UserDTO userDTO = modelMapper.map(user, UserDTO.class);

        return Response.<UserDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("User retrieved successfully")
                .data(userDTO)
                .build();
    }

    @Override
    public Response<Page<UserDTO>> getAllUsers(Integer limit,
                                               Integer offset,
                                               String sortField,
                                               String direction,
                                               String name) {
        // Handle defaults
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        if (sortField == null || sortField.isBlank()) sortField = "id";
        if (direction == null || direction.isBlank()) direction = "asc";

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);

        //Pageable pageable = new UserPageRequest(limit, offset, sort);
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit, sort);

        Page<User> userPage;

        if (name != null && !name.isBlank()) {
            userPage = userRepository.findByNameContainingIgnoreCase(name, pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        Page<UserDTO> pageDTO = userPage.map(user -> modelMapper.map(user, UserDTO.class));

        return Response.<Page<UserDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Users retrieved successfully")
                .data(pageDTO)
                .build();
    }
}
