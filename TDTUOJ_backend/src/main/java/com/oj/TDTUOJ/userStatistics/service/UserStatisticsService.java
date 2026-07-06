package com.oj.TDTUOJ.userStatistics.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.userStatistics.dto.UserStatisticsDTO;

/** Maintains and exposes per-user aggregate statistics (solved count, submissions, points, acceptance rate). */
public interface UserStatisticsService {
    // Called by the submission pipeline on every graded submission to bump counters.
    void recordSubmission(Long userId, boolean isAccepted, Integer points);
    // Called when a user solves a problem for the first time (distinct-problem counter).
    void recordProblemSolved(Long userId);
    Response<UserStatisticsDTO> getStatsByUserId(Long userId);
    Response<UserStatisticsDTO> getStatsByUsername(String username);
}