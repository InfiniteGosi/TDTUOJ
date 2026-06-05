package com.oj.TDTUOJ.dashboard.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.dashboard.dto.DashboardStatsDTO;

public interface DashboardService {
    Response<DashboardStatsDTO> getDashboardStats();
}
