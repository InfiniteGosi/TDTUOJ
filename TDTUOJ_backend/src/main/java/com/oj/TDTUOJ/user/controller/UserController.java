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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@RestController
@RequiredArgsConstructor
@RequestMapping("api/users")
public class UserController {
    private final UserService userService;

    private final UserActivityService userActivityService;

    private final UserStatisticsService userStatisticsService;

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
}
