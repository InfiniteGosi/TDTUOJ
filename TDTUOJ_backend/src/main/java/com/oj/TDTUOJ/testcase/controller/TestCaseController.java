package com.oj.TDTUOJ.testcase.controller;

import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.service.TestCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/testcases")
@PreAuthorize("hasAuthority('ADMIN')")
public class TestCaseController {
    private final TestCaseService testCaseService;

    @GetMapping
    public ResponseEntity<Response<List<TestCaseDTO>>> getAllTestCases() {
        return ResponseEntity.ok(testCaseService.getAllTestCases());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response<TestCaseDTO>> getTestCaseById(@PathVariable Long id) {
        return ResponseEntity.ok(testCaseService.getTestCaseById(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<TestCaseDTO>> createTestCase(
            @ModelAttribute @Valid TestCaseDTO testCaseDTO) {
        return ResponseEntity.ok(testCaseService.createTestCase(testCaseDTO));
    }
}
