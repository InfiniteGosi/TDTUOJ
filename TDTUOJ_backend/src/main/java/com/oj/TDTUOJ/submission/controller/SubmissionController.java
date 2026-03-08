package com.oj.TDTUOJ.submission.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/submissions")
public class SubmissionController {
    private final SubmissionService submissionService;

    @PostMapping
    public ResponseEntity<Response<SubmissionDTO>> createSubmission(
            @RequestBody SubmissionDTO submissionDTO
    ) {
        return ResponseEntity.ok(submissionService.createSubmission(submissionDTO));
    }

    @GetMapping("/me")
    public ResponseEntity<Response<Page<SubmissionDTO>>> getMySubmissions(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(required = false) Long problemId
    ) {
        return ResponseEntity.ok(submissionService.getMySubmissions(limit, offset, problemId));
    }
}
