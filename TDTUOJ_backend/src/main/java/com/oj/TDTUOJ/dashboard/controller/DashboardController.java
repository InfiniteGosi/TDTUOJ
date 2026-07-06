package com.oj.TDTUOJ.dashboard.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.dashboard.dto.DashboardStatsDTO;
import com.oj.TDTUOJ.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the admin-only analytics dashboard. Admin-gated at the class level;
 * returns the full metric bundle in a single request.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/admin/dashboard")
@PreAuthorize("hasAuthority('ADMIN')")
public class DashboardController {
    private final DashboardService dashboardService;

    /** GET /api/admin/dashboard — aggregate platform statistics for the admin dashboard. */
    @GetMapping
    public ResponseEntity<Response<DashboardStatsDTO>> getDashboardStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }
}
