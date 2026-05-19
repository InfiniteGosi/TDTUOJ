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

    @GetMapping
    public ResponseEntity<Response<Page<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "id") String sortField,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String username) {
        return ResponseEntity.ok(userService.getAllUsers(limit, offset, sortField, direction, username));
    }

    @GetMapping("/account")
    public ResponseEntity<Response<UserDTO>> getAccountDetails() {
        return ResponseEntity.ok(userService.getOwnAccountDetails());
    }

    @GetMapping("{username}")
    public ResponseEntity<Response<UserDTO>> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<?>> updateOwnAccount(
            @ModelAttribute UserDTO userDTO,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile
    ) {
        userDTO.setProfileImage(imageFile);
        return ResponseEntity.ok(userService.updateOwnAccount(userDTO));
    }

    @DeleteMapping("/deactivate")
    public ResponseEntity<Response<?>> deactivateOwnAccount() {
        return ResponseEntity.ok(userService.deactivateOwnAccount());
    }

    @PutMapping("/change-password")
    public ResponseEntity<Response<?>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {

        Response<?> response = userService.changePassword(request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @GetMapping("/{username}/activity")
    public ResponseEntity<Response<List<UserDailyActivityDTO>>> getUserActivity(
            @PathVariable String username) {
        return ResponseEntity.ok(userActivityService.getActivityForYearByUsername(username));
    }

    @GetMapping("/{username}/statistics")
    public ResponseEntity<Response<UserStatisticsDTO>> getUserStatistics(
            @PathVariable String username) {
        return ResponseEntity.ok(userStatisticsService.getStatsByUsername(username));
    }

    @GetMapping("/{username}/rating-history")
    public ResponseEntity<Response<List<RatingHistoryDTO>>> getRatingHistory(
            @PathVariable String username) {
        return ResponseEntity.ok(userService.getRatingHistory(username));
    }

    @GetMapping("/{username}/submissions")
    public ResponseEntity<Response<Page<SubmissionDTO>>> getUserSubmissions(
            @PathVariable String username,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        Long userId = userService.getUserByUsername(username).getData().getId();
        int page = (limit > 0) ? offset / limit : 0;
        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "submissionDate"));
        Page<SubmissionDTO> result = submissionRepository.findByUserId(userId, pageable)
                .map(s -> modelMapper.map(s, SubmissionDTO.class));
        return ResponseEntity.ok(Response.<Page<SubmissionDTO>>builder()
                .statusCode(200).message("ok").data(result).build());
    }

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

    @GetMapping("/{username}/language-stats")
    public ResponseEntity<Response<Map<String, Long>>> getLanguageStats(
            @PathVariable String username) {
        var userResp = userService.getUserByUsername(username);
        Long userId = userResp.getData().getId();
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
