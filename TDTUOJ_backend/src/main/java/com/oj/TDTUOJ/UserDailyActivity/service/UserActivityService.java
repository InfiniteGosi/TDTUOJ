package com.oj.TDTUOJ.UserDailyActivity.service;

import com.oj.TDTUOJ.UserDailyActivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.common.response.Response;

import java.util.List;

public interface UserActivityService {
    void recordSubmission(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYear(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYearByUsername(String username);
}