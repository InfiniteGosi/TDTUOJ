package com.oj.TDTUOJ.problemComment.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemComment.dto.ProblemCommentDTO;
import com.oj.TDTUOJ.problemComment.dto.VoteRequestDTO;
import com.oj.TDTUOJ.problemComment.service.ProblemCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


/**
 * Base path: /api/problems/{problemId}/comments
 *
 * GET    /                          → list all comments + replies (public)
 * POST   /                          → create comment or reply (auth required)
 * PUT    /{commentId}               → edit comment (author only)
 * DELETE /{commentId}               → soft delete (author / admin)
 * POST   /{commentId}/vote          → toggle vote (auth required)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/problems/{problemId}/comments")
public class ProblemCommentController {

    private final ProblemCommentService commentService;

    /**
     * GET /api/problems/{problemId}/comments?page=0&size=10
     * Returns paginated top-level comments (replies embedded).
     */
    @GetMapping
    public ResponseEntity<Response<Page<ProblemCommentDTO>>> getComments(
            @PathVariable Long problemId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(commentService.getComments(problemId, page, size));
    }

    @PostMapping
    public ResponseEntity<Response<ProblemCommentDTO>> createComment(
            @PathVariable Long problemId,
            @RequestBody ProblemCommentDTO dto) {
        return ResponseEntity.ok(commentService.createComment(problemId, dto));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<Response<ProblemCommentDTO>> editComment(
            @PathVariable Long problemId,
            @PathVariable Long commentId,
            @RequestBody ProblemCommentDTO dto) {
        return ResponseEntity.ok(commentService.editComment(problemId, commentId, dto));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Response<?>> deleteComment(
            @PathVariable Long problemId,
            @PathVariable Long commentId) {
        return ResponseEntity.ok(commentService.deleteComment(problemId, commentId));
    }

    @PostMapping("/{commentId}/vote")
    public ResponseEntity<Response<ProblemCommentDTO>> voteComment(
            @PathVariable Long problemId,
            @PathVariable Long commentId,
            @RequestBody VoteRequestDTO dto) {
        return ResponseEntity.ok(commentService.voteComment(problemId, commentId, dto.getVoteType()));
    }
}
