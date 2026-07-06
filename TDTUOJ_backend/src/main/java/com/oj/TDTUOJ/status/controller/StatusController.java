package com.oj.TDTUOJ.status.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.status.dto.JudgeStatusResponse;
import com.oj.TDTUOJ.status.service.StatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public system-status endpoints. Backs the Status page; intentionally
 * unauthenticated so uptime can be checked without logging in.
 */
@RestController
@RequestMapping("/api/status")
@RequiredArgsConstructor
public class StatusController {

    private final StatusService statusService;

    /** GET /api/status/judge — current Judge0 engine health (reachability, version, workers). */
    @GetMapping("/judge")
    public ResponseEntity<Response<JudgeStatusResponse>> getJudgeStatus() {
        JudgeStatusResponse data = statusService.getJudgeStatus();
        return ResponseEntity.ok(Response.<JudgeStatusResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Judge engine status")
                .data(data)
                .build());
    }
}
