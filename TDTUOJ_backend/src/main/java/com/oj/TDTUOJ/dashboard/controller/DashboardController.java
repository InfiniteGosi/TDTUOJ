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

@RestController
@RequiredArgsConstructor
@RequestMapping("api/admin/dashboard")
@PreAuthorize("hasAuthority('ADMIN')")
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<Response<DashboardStatsDTO>> getDashboardStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }
}
