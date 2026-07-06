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
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * User account service. Handles profile reads, the leaderboard listing (which
 * joins in {@link UserStatistics} for points/rating and computes a global rank),
 * self-service mutations, and admin edits. Avatars are stored in S3.
 */
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
    private final UserStatisticsRepository userStatisticsRepository;

    /**
     * Resolves the authenticated caller from the security context. The JWT's
     * subject is the email, so the principal name is used to load the entity.
     */
    @Override
    public User getCurrentLoggedInUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /** Returns the caller's own account details. */
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

    /** Fetch a user by primary key (admin path). */
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

    /** Fetch a user by username slug (public profile path). */
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

    /**
     * Leaderboard listing. Pages over users (optionally filtered by username),
     * enriches each with points/rating from {@link UserStatistics}, and stamps a
     * stable global rank. Sorting supports fields that live on the stats table,
     * which requires the JpaSort/join workaround below.
     */
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

        // point/rating live on UserStatistics, not User, so a plain Sort on the
        // User root fails ("No property 'rating' found for type 'User'").
        // Map sort keys to JPQL expressions over the User + UserStatistics join
        // and apply them via JpaSort.unsafe so ORDER BY can target alias "s".
        Map<String, String> sortExpr = Map.of(
                "id", "u.id",
                "username", "u.username",
                "point", "s.totalPoints",
                "rating", "s.currentRating");
        String expr = sortExpr.getOrDefault(sortField, "u.id");

        Sort sort = JpaSort.unsafe(Sort.Direction.fromString(direction), expr);
        if (!"u.id".equals(expr)) {
            sort = sort.and(JpaSort.unsafe(Sort.Direction.ASC, "u.id")); // stable tiebreak
        }

        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit, sort);

        String usernameFilter = (username != null) ? username : "";
        Page<User> userPage = userRepository.findAllForLeaderboard(usernameFilter, pageable);

        // Batch-load stats for just this page's users (avoids an N+1 lookup per row).
        List<Long> userIds = userPage.getContent().stream().map(User::getId).collect(Collectors.toList());
        Map<Long, UserStatistics> statsMap = userStatisticsRepository.findAllByUserIdIn(userIds)
                .stream().collect(Collectors.toMap(UserStatistics::getUserId, Function.identity()));

        // Global leaderboard rank (userId -> rank), independent of the current sort/page.
        // Only users with a positive score are ranked; everyone else stays unranked (null).
        Map<Long, Integer> rankMap = computeGlobalRanks();

        Page<UserDTO> pageDTO = userPage.map(user -> {
            UserDTO dto = modelMapper.map(user, UserDTO.class);
            UserStatistics stats = statsMap.get(user.getId());
            if (stats != null) {
                dto.setPoint(stats.getTotalPoints());
                dto.setRating(stats.getCurrentRating());
            } else {
                dto.setPoint(0);
                dto.setRating(0);
            }
            dto.setRank(rankMap.get(user.getId()));
            return dto;
        });

        return Response.<Page<UserDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Users retrieved successfully")
                .data(pageDTO)
                .build();
    }

    /**
     * Builds a global userId -> rank map ordered by rating desc, then points desc.
     * Only users with a positive score are ranked; the rest are omitted (unranked).
     * Rank is a stable per-user property, so medals stay on the same users no matter
     * how the client sorts or paginates the list.
     */
    private Map<Long, Integer> computeGlobalRanks() {
        List<UserStatistics> ranked = userStatisticsRepository.findAll().stream()
                .filter(s -> nz(s.getCurrentRating()) > 0 || nz(s.getTotalPoints()) > 0)
                .sorted((a, b) -> {
                    int byRating = Integer.compare(nz(b.getCurrentRating()), nz(a.getCurrentRating()));
                    return byRating != 0 ? byRating
                            : Integer.compare(nz(b.getTotalPoints()), nz(a.getTotalPoints()));
                })
                .toList();

        Map<Long, Integer> rankMap = new HashMap<>();
        for (int i = 0; i < ranked.size(); i++) {
            rankMap.put(ranked.get(i).getUserId(), i + 1);
        }
        return rankMap;
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }

    /**
     * Self-service profile update. Only name/about and the avatar are editable
     * here (identity/role/status fields are intentionally not touched); non-null
     * DTO fields are applied so the client can send partial updates.
     */
    @Override
    public Response<?> updateOwnAccount(UserDTO userDTO) {
        User user = getCurrentLoggedInUser();
        String profileUrl = user.getProfileUrl();
        MultipartFile imageFile = userDTO.getProfileImage();

        // Check if a new profile image is uploaded
        if (imageFile != null && !imageFile.isEmpty()) {
            // Delete old image first so replaced avatars don't accumulate as orphaned S3 objects.
            if (profileUrl != null && !profileUrl.isEmpty()) {
                // Derive the S3 key from the stored URL's trailing path segment.
                String keyName = profileUrl.substring(profileUrl.lastIndexOf("/") + 1);
                awsS3Service.deleteFile("profile/" + keyName);
            }

            // Prefix the key with the username and strip whitespace so the object name is unique and URL-safe.
            String originalName = imageFile.getOriginalFilename();
            String safeName = originalName != null ? originalName.replaceAll("\\s+", "_") : "image";
            String imageName = user.getUsername() + "_" + safeName;

            URL newImageUrl = awsS3Service.uploadFile("profile/" + imageName, imageFile);
            user.setProfileUrl(newImageUrl.toString());
        }

        // Partial update: only overwrite fields the client actually sent.
        if (userDTO.getName() != null) user.setName(userDTO.getName());
        if (userDTO.getAbout() != null) user.setAbout(userDTO.getAbout());

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account updated successfully")
                .build();
    }

    /**
     * Admin edit of any user. Beyond the self-service fields, admins may change
     * active status, password, email (with a uniqueness re-check), and the role
     * set. Roles arrive either as {@code roleNames} (multipart form) or {@code roles}
     * (JSON), so both are handled with a PARTICIPANT fallback when neither is given.
     */
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

        // Password is optional on admin edit; when present, BCrypt-hash it (never store plaintext).
        if (userDTO.getPassword() != null && !userDTO.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Only re-check email uniqueness when it actually changed, otherwise the
        // user's own existing email would trip the "already exists" guard.
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

    /**
     * Self-service password change. Runs the checks in order — confirmation match,
     * current-password proof, difference from the old password, minimum length —
     * before persisting the new BCrypt hash.
     */
    @Override
    public Response<?> changePassword(ChangePasswordRequest request) {
        User user = getCurrentLoggedInUser();

        // Validate that new password matches confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New passwords do not match");
        }

        // Prove the caller knows the current password before allowing a change.
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Reject a no-op change (new hash matches the stored one).
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

    /** Soft-deletes the caller's account by flagging it inactive (login then rejects it). */
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
    /** Returns a user's per-contest rating changes, newest first, for the profile rating chart. */
    @Override
    public Response<List<RatingHistoryDTO>> getRatingHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));

        List<RatingHistoryDTO> history = ratingHistoryRepository
                .findByUserIdOrderByContestEndTimeDescIdDesc(user.getId())
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
                    dto.setContestEndTime(rh.getContestEndTime());
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
