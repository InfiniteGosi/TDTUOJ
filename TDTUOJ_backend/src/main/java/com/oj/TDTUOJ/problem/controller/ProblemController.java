package com.oj.TDTUOJ.problem.controller;

import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.service.ProblemService;
import com.oj.TDTUOJ.response.Response;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/problems")
public class ProblemController {
    private final ProblemService problemService;

    @GetMapping
    public ResponseEntity<Response<Page<ProblemDTO>>> getAllProblems(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "id") String sortField,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String title) {
        return ResponseEntity.ok(problemService.getAllProblems(limit, offset, sortField, direction, title));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response<ProblemDTO>> getProblemById(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.getProblemById(id));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<ProblemDTO>> createProblem(
            @ModelAttribute @Valid ProblemDTO problemDTO) {
        return ResponseEntity.ok(problemService.createProblem(problemDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<ProblemDTO>> updateProblem(
            @ModelAttribute @Valid ProblemDTO problemDTO) {
        return ResponseEntity.ok(problemService.updateProblem(problemDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Response<?>> deleteProblem(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.deleteProblem(id));
    }
}
