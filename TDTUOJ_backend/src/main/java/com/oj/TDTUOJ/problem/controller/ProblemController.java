package com.oj.TDTUOJ.problem.controller;

import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.service.ProblemService;
import com.oj.TDTUOJ.common.response.Response;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
            @RequestParam(required = false) String title,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String difficulty) {
        return ResponseEntity.ok(problemService.getAllProblems(limit, offset, sortField, direction, title, tags, difficulty));
    }

    @GetMapping("id/{id}")
    public ResponseEntity<Response<ProblemDTO>> getProblemById(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.getProblemById(id));
    }

    @GetMapping("slug/{slug}")
    public ResponseEntity<Response<ProblemDTO>> getProblemBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(problemService.getProblemBySlug(slug));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<ProblemDTO>> createProblem(
            @ModelAttribute @Valid ProblemDTO problemDTO) {
        return ResponseEntity.ok(problemService.createProblem(problemDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<ProblemDTO>> updateProblem(
            @ModelAttribute @Valid ProblemDTO problemDTO) {
        return ResponseEntity.ok(problemService.updateProblem(problemDTO));
    }

    /**
     * Replace the tags of a problem.
     * Accepts either tagNames (list of tag name strings) or tags (list of TagDTO with id or name).
     *
     * Example body:
     * { "tagNames": ["Array", "Dynamic Programming"] }
     * or
     * { "tags": [{ "id": 1 }, { "id": 3 }] }
     */
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @PatchMapping("/{id}/tags")
    public ResponseEntity<Response<ProblemDTO>> updateProblemTags(
            @PathVariable Long id,
            @RequestBody ProblemDTO problemDTO) {
        return ResponseEntity.ok(problemService.updateProblemTags(id, problemDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Response<?>> deleteProblem(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.deleteProblem(id));
    }
}