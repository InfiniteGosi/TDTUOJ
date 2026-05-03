package com.oj.TDTUOJ.userDailyActivity.service;

import com.oj.TDTUOJ.userDailyActivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.common.response.Response;

import java.util.List;

public interface UserActivityService {
    void recordSubmission(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYear(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYearByUsername(String username);
}