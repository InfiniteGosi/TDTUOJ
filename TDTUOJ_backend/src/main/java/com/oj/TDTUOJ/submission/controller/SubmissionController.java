package com.oj.TDTUOJ.submission.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.dto.SubmissionAnalysisResult;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoints for submissions under {@code /api/submissions}. Thin layer that delegates to
 * {@link SubmissionService} and forwards the service's status code onto the HTTP response.
 * Submission creation returns 202 Accepted (judging is async); clients then poll the status
 * endpoint until the verdict resolves.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/submissions")
public class SubmissionController {
    private final SubmissionService submissionService;

    /** Accepts a new submission and queues it for judging. Returns 202 with queue position. */
    @PostMapping
    public ResponseEntity<Response<SubmissionDTO>> createSubmission(
            @RequestBody SubmissionDTO submissionDTO
    ) {
        Response<SubmissionDTO> response = submissionService.createSubmission(submissionDTO);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    /** Polling endpoint: returns the submission's current status/verdict (and queue position if PENDING). */
    @GetMapping("/{id}/status")
    public ResponseEntity<Response<SubmissionDTO>> getSubmissionStatus(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(submissionService.getSubmissionStatus(id));
    }

    /** Generates/returns cached AI analysis for an Accepted submission (owner or admin only). */
    @PostMapping("/{id}/analysis")
    public ResponseEntity<Response<SubmissionAnalysisResult>> analyzeSubmission(
            @PathVariable Long id
    ) {
        Response<SubmissionAnalysisResult> response = submissionService.getSubmissionAnalysis(id);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    /** Platform-wide submission count (dashboard metric). */
    @GetMapping("/count")
    public ResponseEntity<Response<Long>> getTotalSubmissionsCount() {
        return ResponseEntity.ok(submissionService.getTotalSubmissionsCount());
    }

    /** Paginated list of the authenticated user's own submissions, optionally scoped to a problem. */
    @GetMapping("/me")
    public ResponseEntity<Response<Page<SubmissionDTO>>> getMySubmissions(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(required = false) Long problemId
    ) {
        return ResponseEntity.ok(submissionService.getMySubmissions(limit, offset, problemId));
    }
}
