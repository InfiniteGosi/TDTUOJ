package com.oj.TDTUOJ.problemFavorite.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problemFavorite.dto.ProblemFavoriteDTO;
import com.oj.TDTUOJ.problemFavorite.service.ProblemFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for the per-user problem bookmark ("favorite") feature.
 * Base path: {@code /api/favorites}. All routes operate on the authenticated caller.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/favorites")
public class ProblemFavoriteController {

    private final ProblemFavoriteService favoriteService;

    /**
     * GET /api/favorites
     * Returns the authenticated user's favorite problem list.
     * Requires authentication (handled by SecurityConfig — anyRequest().authenticated()).
     */
    @GetMapping
    public ResponseEntity<Response<List<ProblemDTO>>> getFavoriteProblems() {
        return ResponseEntity.ok(favoriteService.getFavoriteProblems());
    }

    /**
     * POST /api/favorites/{problemId}
     * Toggles favorite status for the given problem.
     * Response body contains isFavorited=true (added) or isFavorited=false (removed).
     */
    @PostMapping("/{problemId}")
    public ResponseEntity<Response<ProblemFavoriteDTO>> toggleFavorite(
            @PathVariable Long problemId) {
        return ResponseEntity.ok(favoriteService.toggleFavorite(problemId));
    }
}
