package com.oj.TDTUOJ.userstatistics.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.userstatistics.dto.UserStatisticsDTO;

public interface UserStatisticsService {
    void recordSubmission(Long userId, boolean isAccepted, Integer points);
    void recordProblemSolved(Long userId);
    Response<UserStatisticsDTO> getStatsByUserId(Long userId);
    Response<UserStatisticsDTO> getStatsByUsername(String username);
}