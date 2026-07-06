package com.oj.TDTUOJ.user.controller;

import com.oj.TDTUOJ.contest.dto.RatingHistoryDTO;

import com.oj.TDTUOJ.userDailyActivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.userDailyActivity.service.UserActivityService;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.ChangePasswordRequest;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.service.UserService;
import com.oj.TDTUOJ.userStatistics.dto.UserStatisticsDTO;
import com.oj.TDTUOJ.userStatistics.service.UserStatisticsService;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.organization.dto.OrganizationDTO;
import com.oj.TDTUOJ.organization.repository.OrganizationMemberRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


/**
 * User-facing endpoints: public profile reads (leaderboard, profile pages,
 * activity/statistics) plus self-service account actions (update, deactivate,
 * change password). Profile sub-resources like submissions and organizations
 * are assembled here from their owning repositories rather than the user service.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/users")
public class UserController {
    private final UserService                   userService;
    private final UserActivityService           userActivityService;
    private final UserStatisticsService         userStatisticsService;
    private final SubmissionRepository          submissionRepository;
    private final OrganizationMemberRepository  memberRepository;
    private final ModelMapper                   modelMapper;

    /** Public leaderboard listing with sorting (id/username/point/rating) and optional username filter. */
    @GetMapping
    public ResponseEntity<Response<Page<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "id") String sortField,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String username) {
        return ResponseEntity.ok(userService.getAllUsers(limit, offset, sortField, direction, username));
    }

    /** Details of the currently authenticated user, resolved from the JWT rather than a path param. */
    @GetMapping("/account")
    public ResponseEntity<Response<UserDTO>> getAccountDetails() {
        return ResponseEntity.ok(userService.getOwnAccountDetails());
    }

    /** Public profile lookup by username slug. */
    @GetMapping("{username}")
    public ResponseEntity<Response<UserDTO>> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    /**
     * Self-service profile update. Multipart so an avatar upload can accompany
     * the form fields; the optional image part is merged into the DTO before
     * the service applies changes to the caller's own account.
     */
    @PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<?>> updateOwnAccount(
            @ModelAttribute UserDTO userDTO,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile
    ) {
        userDTO.setProfileImage(imageFile);
        return ResponseEntity.ok(userService.updateOwnAccount(userDTO));
    }

    /** Soft-delete: flips the caller's account to inactive rather than removing the row. */
    @DeleteMapping("/deactivate")
    public ResponseEntity<Response<?>> deactivateOwnAccount() {
        return ResponseEntity.ok(userService.deactivateOwnAccount());
    }

    /**
     * Change the caller's password. Propagates the service's own status code
     * (not a blanket 200) so validation failures surface with their real status.
     */
    @PutMapping("/change-password")
    public ResponseEntity<Response<?>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {

        Response<?> response = userService.changePassword(request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    /** One year of daily activity for the profile heatmap. */
    @GetMapping("/{username}/activity")
    public ResponseEntity<Response<List<UserDailyActivityDTO>>> getUserActivity(
            @PathVariable String username) {
        return ResponseEntity.ok(userActivityService.getActivityForYearByUsername(username));
    }

    /** Aggregate stats (solved count, rating, etc.) shown on the profile page. */
    @GetMapping("/{username}/statistics")
    public ResponseEntity<Response<UserStatisticsDTO>> getUserStatistics(
            @PathVariable String username) {
        return ResponseEntity.ok(userStatisticsService.getStatsByUsername(username));
    }

    /** Per-contest rating change history for the profile rating chart. */
    @GetMapping("/{username}/rating-history")
    public ResponseEntity<Response<List<RatingHistoryDTO>>> getRatingHistory(
            @PathVariable String username) {
        return ResponseEntity.ok(userService.getRatingHistory(username));
    }

    /**
     * Paginated submission feed for a profile. Access is visibility-gated:
     * see {@link #canViewAllSubmissions(Long)} for who gets the unfiltered view.
     */
    @GetMapping("/{username}/submissions")
    public ResponseEntity<Response<Page<SubmissionDTO>>> getUserSubmissions(
            @PathVariable String username,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        Long userId = userService.getUserByUsername(username).getData().getId();
        // Client sends a row offset; convert to a Spring page index (guard against divide-by-zero).
        int page = (limit > 0) ? offset / limit : 0;
        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "submissionDate"));
        // Contest fairness: locked-contest submissions are excluded from the public
        // feed — except when the viewer is the profile owner or an ADMIN.
        Page<com.oj.TDTUOJ.submission.entity.Submission> submissions =
                canViewAllSubmissions(userId)
                        ? submissionRepository.findByUserId(userId, pageable)
                        : submissionRepository.findVisibleByUserId(userId, java.time.LocalDateTime.now(), pageable);
        Page<SubmissionDTO> result = submissions.map(s -> modelMapper.map(s, SubmissionDTO.class));
        return ResponseEntity.ok(Response.<Page<SubmissionDTO>>builder()
                .statusCode(200).message("ok").data(result).build());
    }

    /**
     * Profile owner and ADMINs see the unfiltered submission feed (including
     * locked-contest submissions). Everyone else — anonymous included — gets
     * the visibility-filtered feed.
     */
    private boolean canViewAllSubmissions(Long profileUserId) {
        try {
            com.oj.TDTUOJ.user.entity.User viewer = userService.getCurrentLoggedInUser();
            if (viewer.getId().equals(profileUserId)) return true;
            return viewer.getRoles().stream()
                    .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        } catch (Exception e) {
            return false; // anonymous
        }
    }

    /**
     * Organizations the user belongs to. Built from membership rows so each DTO
     * can be stamped with the viewer-user's role in that org ({@code myRole}).
     */
    @GetMapping("/{username}/organizations")
    public ResponseEntity<Response<Page<OrganizationDTO>>> getUserOrganizations(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Long userId = userService.getUserByUsername(username).getData().getId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "joinedAt"));
        Page<OrganizationDTO> result = memberRepository.findByUserId(userId, pageable)
                .map(m -> {
                    OrganizationDTO dto = modelMapper.map(m.getOrganization(), OrganizationDTO.class);
                    dto.setMyRole(m.getRole().name());
                    return dto;
                });
        return ResponseEntity.ok(Response.<Page<OrganizationDTO>>builder()
                .statusCode(200).message("ok").data(result).build());
    }

    /** Count of accepted submissions per language, for the profile's language breakdown chart. */
    @GetMapping("/{username}/language-stats")
    public ResponseEntity<Response<Map<String, Long>>> getLanguageStats(
            @PathVariable String username) {
        var userResp = userService.getUserByUsername(username);
        Long userId = userResp.getData().getId();
        // Repository returns raw [language, count] tuples; fold them into an
        // ordered map (LinkedHashMap preserves the query's ordering for the chart).
        List<Object[]> rows = submissionRepository.countAcByLanguage(userId);
        Map<String, Long> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            result.put(row[0].toString(), (Long) row[1]);
        }
        return ResponseEntity.ok(
            Response.<Map<String, Long>>builder()
                .statusCode(200)
                .message("Language stats retrieved")
                .data(result)
                .build()
        );
    }
}
