package com.oj.TDTUOJ.userDailyActivity.service;

import com.oj.TDTUOJ.userDailyActivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.userDailyActivity.entity.UserDailyActivity;
import com.oj.TDTUOJ.userDailyActivity.repository.UserDailyActivityRepository;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/** Default {@link UserActivityService} maintaining one submission-count bucket per user per day. */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserActivityServiceImpl implements UserActivityService {
    private final UserDailyActivityRepository activityRepository;

    private final UserRepository userRepository;

    private final ModelMapper modelMapper;

    /** Adds one to today's submission count, creating the day's bucket on first submission. */
    @Override
    public void recordSubmission(Long userId) {
        LocalDate today = LocalDate.now();

        // Reuse today's row if present; otherwise start a fresh zero-count bucket for today.
        UserDailyActivity activity = activityRepository
                .findByUserIdAndActivityDate(userId, today)
                .orElseGet(() -> UserDailyActivity.builder()
                        .userId(userId)
                        .activityDate(today)
                        .submissionsCount(0)
                        .build());

        activity.setSubmissionsCount(activity.getSubmissionsCount() + 1);
        activityRepository.save(activity);
    }

    /** Returns the last 12 months of daily activity; only days with activity are present (sparse). */
    @Override
    public Response<List<UserDailyActivityDTO>> getActivityForYear(Long userId) {
        // Rolling one-year window ending today — matches the heatmap's visible range.
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusYears(1);

        List<UserDailyActivityDTO> activityList = activityRepository
                .findByUserIdAndActivityDateBetween(userId, start, end)
                .stream()
                .map(a -> modelMapper.map(a, UserDailyActivityDTO.class))
                .collect(Collectors.toList());

        return Response.<List<UserDailyActivityDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("User activity retrieved successfully")
                .data(activityList)
                .build();
    }

    /** Resolves the username to an id, then delegates to {@link #getActivityForYear}. */
    @Override
    public Response<List<UserDailyActivityDTO>> getActivityForYearByUsername(String username) {
        Long userId = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"))
                .getId();
        return getActivityForYear(userId);
    }
}
