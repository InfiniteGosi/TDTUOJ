package com.oj.TDTUOJ.userdailyactivity.service;

import com.oj.TDTUOJ.userdailyactivity.dto.UserDailyActivityDTO;
import com.oj.TDTUOJ.common.response.Response;

import java.util.List;

public interface UserActivityService {
    void recordSubmission(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYear(Long userId);
    Response<List<UserDailyActivityDTO>> getActivityForYearByUsername(String username);
}