package com.oj.TDTUOJ.dashboard.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.dashboard.dto.DashboardStatsDTO;

/** Assembles the admin analytics dashboard from platform-wide aggregate queries. */
public interface DashboardService {
    Response<DashboardStatsDTO> getDashboardStats();
}
