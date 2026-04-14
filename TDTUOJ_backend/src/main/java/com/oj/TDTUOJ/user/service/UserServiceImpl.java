package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.RatingHistoryDTO;
import com.oj.TDTUOJ.contest.entity.RatingHistory;
import com.oj.TDTUOJ.contest.repository.RatingHistoryRepository;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import com.oj.TDTUOJ.user.dto.ChangePasswordRequest;
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
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
    private final RatingHistoryRepository ratingHistoryRepository;

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
    public Response<UserDTO> getUserByUsername(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new NotFoundException("User not found"));
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
                                               String username) {
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

        if (username != null && !username.isBlank()) {
            userPage = userRepository.findByUsernameContainingIgnoreCase(username, pageable);
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

    @Override
    public Response<?> updateOwnAccount(UserDTO userDTO) {
        User user = getCurrentLoggedInUser();
        String profileUrl = user.getProfileUrl();
        MultipartFile imageFile = userDTO.getProfileImage();

        // Check if a new profile image is uploaded
        if (imageFile != null && !imageFile.isEmpty()) {
            // Delete old image in S3 if it exists
            if (profileUrl != null && !profileUrl.isEmpty()) {
                String keyName = profileUrl.substring(profileUrl.lastIndexOf("/") + 1);
                awsS3Service.deleteFile("profile/" + keyName);
            }

            // Upload new image to S3 with a unique name
            String originalName = imageFile.getOriginalFilename();
            String safeName = originalName != null ? originalName.replaceAll("\\s+", "_") : "image";
            String imageName = user.getUsername() + "_" + safeName;

            URL newImageUrl = awsS3Service.uploadFile("profile/" + imageName, imageFile);
            user.setProfileUrl(newImageUrl.toString());
        }

        // Update non-null fields
        if (userDTO.getName() != null) user.setName(userDTO.getName());
        if (userDTO.getAbout() != null) user.setAbout(userDTO.getAbout());

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account updated successfully")
                .build();
    }

    @Override
    public Response<?> updateUserAsAdmin(UserDTO userDTO) {
        User user = userRepository.findById(userDTO.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        String profileUrl = user.getProfileUrl();
        MultipartFile imageFile = userDTO.getProfileImage();

        // Check if a new profile image is uploaded
        if (imageFile != null && !imageFile.isEmpty()) {
            // Delete old image in S3 if it exists
            if (profileUrl != null && !profileUrl.isEmpty()) {
                String keyName = profileUrl.substring(profileUrl.lastIndexOf("/") + 1);
                awsS3Service.deleteFile("profile/" + keyName);
            }

            // Upload new image to S3 with a unique name
            String originalName = imageFile.getOriginalFilename();
            String safeName = originalName != null ? originalName.replaceAll("\\s+", "_") : "image";
            String imageName = user.getUsername() + "_" + safeName;

            URL newImageUrl = awsS3Service.uploadFile("profile/" + imageName, imageFile);
            log.info(newImageUrl.toString());
            user.setProfileUrl(newImageUrl.toString());
        }

        // Update non-null fields
        if (userDTO.getName() != null) user.setName(userDTO.getName());
        if (userDTO.getAbout() != null) user.setAbout(userDTO.getAbout());
        if (userDTO.getIsActive() != null) user.setIsActive(userDTO.getIsActive());

        // Update password if provided
        if (userDTO.getPassword() != null && !userDTO.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Update email if changed
        if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(userDTO.getEmail());
        }

        // Update roles — prefer roleNames (from multipart form), fall back to roles set (from JSON)
        Set<Role> userRoles;
        List<String> roleNames = userDTO.getRoleNames();

        if (roleNames != null && !roleNames.isEmpty()) {
            userRoles = roleNames.stream()
                    .map(name -> roleRepository.findByName(name.toUpperCase())
                            .orElseThrow(() -> new NotFoundException("Role not found: " + name.toUpperCase())))
                    .collect(Collectors.toSet());
        } else if (userDTO.getRoles() != null && !userDTO.getRoles().isEmpty()) {
            userRoles = userDTO.getRoles().stream()
                    .map(roleDTO -> roleRepository.findByName(roleDTO.getName().toUpperCase())
                            .orElseThrow(() -> new NotFoundException("Role not found: " + roleDTO.getName().toUpperCase())))
                    .collect(Collectors.toSet());
        } else {
            Role defaultRole = roleRepository.findByName("PARTICIPANT")
                    .orElseThrow(() -> new NotFoundException("PARTICIPANT role not found"));
            userRoles = new HashSet<>(Set.of(defaultRole));
        }

        user.setRoles(userRoles);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("User updated successfully by admin")
                .build();
    }

    @Override
    public Response<?> changePassword(ChangePasswordRequest request) {
        User user = getCurrentLoggedInUser();

        // Validate that new password matches confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New passwords do not match");
        }

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Don't allow same password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from current password");
        }

        // Validate password strength (optional)
        if (request.getNewPassword().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters long");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Password changed successfully")
                .build();
    }

    @Override
    public Response<?> deactivateOwnAccount() {
        User user = getCurrentLoggedInUser();
        user.setIsActive(false);
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account deactivated successfully")
                .build();
    }
    @Override
    public Response<List<RatingHistoryDTO>> getRatingHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));

        List<RatingHistoryDTO> history = ratingHistoryRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(rh -> {
                    RatingHistoryDTO dto = new RatingHistoryDTO();
                    dto.setContestId(rh.getContestId());
                    dto.setContestName(rh.getContestName());
                    dto.setOldRating(rh.getOldRating());
                    dto.setNewRating(rh.getNewRating());
                    dto.setRatingChange(rh.getRatingChange());
                    dto.setRank(rh.getRank());
                    dto.setCreatedAt(rh.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        return Response.<List<RatingHistoryDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Rating history retrieved")
                .data(history)
                .build();
    }
}
