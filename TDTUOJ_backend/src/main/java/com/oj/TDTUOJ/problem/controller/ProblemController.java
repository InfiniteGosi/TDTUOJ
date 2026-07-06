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

/**
 * REST endpoints for problems under {@code /api/problems}.
 *
 * <p>Read endpoints (list, by-id, by-slug) are public and only surface {@code isPublic}
 * problems; management endpoints (create/update/delete/tags) and the lecturer views
 * ({@code /my}, {@code /contest-eligible}) are gated to ADMIN/CREATOR via
 * {@link PreAuthorize}. Create/update consume multipart form data because the statement
 * and test-case files are uploaded alongside the JSON fields.</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/problems")
public class ProblemController {
    private final ProblemService problemService;

    /**
     * Public, paginated problem listing with optional title / tag / difficulty filters.
     * {@code offset} is a row offset (converted to a page index in the service), not a page number.
     */
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

    /** Fetch by URL slug (the id used in public links). Enforces the private-problem visibility guard in the service. */
    @GetMapping("slug/{slug}")
    public ResponseEntity<Response<ProblemDTO>> getProblemBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(problemService.getProblemBySlug(slug));
    }

    /** Lecturer's problem repository — problems authored by current user. */
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @GetMapping("/my")
    public ResponseEntity<Response<Page<ProblemDTO>>> getMyProblems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        return ResponseEntity.ok(problemService.getMyProblems(page, size, search));
    }

    /** Problems usable in a contest: private + zero non-author submissions. */
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @GetMapping("/contest-eligible")
    public ResponseEntity<Response<Page<ProblemDTO>>> getContestEligibleProblems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        return ResponseEntity.ok(problemService.getContestEligibleProblems(page, size, search));
    }

    /** Create a problem. Multipart: statement markdown + test-case input/output files are uploaded to S3 in the service. */
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