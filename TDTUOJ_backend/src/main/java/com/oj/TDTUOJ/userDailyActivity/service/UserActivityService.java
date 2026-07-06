package com.oj.TDTUOJ.userDailyActivity.service;

import com.oj.TDTUOJ.userDailyActivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.common.response.Response;

import java.util.List;

/** Tracks and serves the daily submission activity heatmap for a user. */
public interface UserActivityService {
    // Increments today's bucket; called once per submission by the submission pipeline.
    void recordSubmission(Long userId);
    // Returns the trailing 12 months of activity for heatmap rendering.
    Response<List<UserDailyActivityDTO>> getActivityForYear(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYearByUsername(String username);
}