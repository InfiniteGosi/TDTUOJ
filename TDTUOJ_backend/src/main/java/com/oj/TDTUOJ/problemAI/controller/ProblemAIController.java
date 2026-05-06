package com.oj.TDTUOJ.problemAI.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemAI.dto.GenerateTestCasesRequest;
import com.oj.TDTUOJ.problemAI.dto.GenerateTestCasesResult;
import com.oj.TDTUOJ.problemAI.dto.ProblemExtractionResult;
import com.oj.TDTUOJ.problemAI.service.ProblemAIService;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import com.oj.TDTUOJ.problemTag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/problem-ai")
@Slf4j
public class ProblemAIController {

    private final ProblemAIService problemAIService;
    private final TagRepository tagRepository;

    /**
     * Upload a PDF → AI extracts problem data (title, statement, difficulty,
     * limits, test cases, suggested tags).
     */
    @PostMapping("/extract-pdf")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<ProblemExtractionResult>> extractFromPdf(
            @RequestParam("file") MultipartFile file) {
        try {
            List<String> activeTagNames = tagRepository.findAll().stream()
                    .filter(t -> Boolean.TRUE.equals(t.getIsActive()))
                    .map(Tag::getName)
                    .toList();

            ProblemExtractionResult result = problemAIService.extractFromPdf(file, activeTagNames);

            return ResponseEntity.ok(Response.<ProblemExtractionResult>builder()
                    .statusCode(HttpStatus.OK.value())
                    .message(result.isTestCasesGenerated()
                            ? "Problem extracted. No test cases found in PDF — AI generated them."
                            : "Problem extracted successfully from PDF.")
                    .data(result)
                    .build());

        } catch (IOException e) {
            log.error("Failed to read PDF file", e);
            return ResponseEntity.badRequest()
                    .body(Response.<ProblemExtractionResult>builder()
                            .statusCode(HttpStatus.BAD_REQUEST.value())
                            .message("Failed to read PDF: " + e.getMessage())
                            .build());
        } catch (RuntimeException e) {
            log.error("PDF extraction error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Response.<ProblemExtractionResult>builder()
                            .statusCode(HttpStatus.BAD_REQUEST.value())
                            .message(e.getMessage())
                            .build());
        }
    }

    /**
     * Given a problem statement + desired count (1–50), AI generates test cases.
     */
    @PostMapping("/generate-test-cases")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<GenerateTestCasesResult>> generateTestCases(
            @RequestBody GenerateTestCasesRequest request) {
        try {
            if (request.getProblemStatement() == null || request.getProblemStatement().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Response.<GenerateTestCasesResult>builder()
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .message("Problem statement is required")
                                .build());
            }

            int safeCount = Math.max(1, Math.min(request.getCount(), 50));
            GenerateTestCasesResult result = problemAIService.generateTestCases(
                    request.getProblemStatement(), safeCount);

            return ResponseEntity.ok(Response.<GenerateTestCasesResult>builder()
                    .statusCode(HttpStatus.OK.value())
                    .message(result.getTestCases().size() + " test cases generated successfully.")
                    .data(result)
                    .build());

        } catch (RuntimeException e) {
            log.error("Test case generation error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Response.<GenerateTestCasesResult>builder()
                            .statusCode(HttpStatus.BAD_REQUEST.value())
                            .message(e.getMessage())
                            .build());
        }
    }
}
