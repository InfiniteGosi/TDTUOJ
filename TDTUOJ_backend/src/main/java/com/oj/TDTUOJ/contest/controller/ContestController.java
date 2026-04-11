package com.oj.TDTUOJ.contest.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.ContestDTO;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import com.oj.TDTUOJ.contest.service.ContestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/contests")
public class ContestController {

    private final ContestService contestService;

    // ── Public read endpoints ─────────────────────────────────────────────── //

    @GetMapping
    public ResponseEntity<Response<Page<ContestDTO>>> getPublicContests(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(contestService.getPublicContests(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response<ContestDTO>> getContestById(@PathVariable Long id) {
        return ResponseEntity.ok(contestService.getContestById(id));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Response<ContestDTO>> getContestBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(contestService.getContestBySlug(slug));
    }

    // ── Leaderboard endpoints ─────────────────────────────────────────────── //

    /**
     * Real-time ICPC leaderboard.
     *
     * <p>Backed by a Redis ZSET (composite score = problemsSolved * 1 000 000 − penaltyMinutes).
     * Results are cached in Redis for 30 seconds and persisted to the {@code leaderboard_cache}
     * DB table for durability.
     *
     * @param id   contest id
     * @param page 0-based page (default 0)
     * @param size entries per page (default 50, 0 = all)
     */
    @GetMapping("/{id}/leaderboard")
    public ResponseEntity<Response<LeaderboardDTO>> getLeaderboard(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(contestService.getLeaderboard(id, page, size));
    }

    /**
     * Returns the calling user's rank plus {@code window} participants above and below them.
     * Useful for the "your position" widget on the scoreboard page.
     */
    @GetMapping("/{id}/leaderboard/me")
    public ResponseEntity<Response<List<ScoreboardEntryDTO>>> getMyRank(
            @PathVariable Long id,
            @RequestParam(defaultValue = "3") int window
    ) {
        return ResponseEntity.ok(contestService.getMyRank(id, window));
    }

    // ── Authenticated write endpoints ─────────────────────────────────────── //

    @PostMapping("/{id}/register")
    public ResponseEntity<Response<Void>> register(@PathVariable Long id) {
        Response<Void> response = contestService.registerForContest(id);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @DeleteMapping("/{id}/register")
    public ResponseEntity<Response<Void>> unregister(@PathVariable Long id) {
        Response<Void> response = contestService.unregisterFromContest(id);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @GetMapping("/{id}/is-registered")
    public ResponseEntity<Response<Boolean>> isRegistered(@PathVariable Long id) {
        return ResponseEntity.ok(contestService.isRegisteredForContest(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<ContestDTO>> createContest(
            @Valid @RequestBody ContestDTO dto
    ) {
        Response<ContestDTO> response = contestService.createContest(dto);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<ContestDTO>> updateContest(
            @PathVariable Long id,
            @Valid @RequestBody ContestDTO dto
    ) {
        return ResponseEntity.ok(contestService.updateContest(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<Void>> deleteContest(@PathVariable Long id) {
        return ResponseEntity.ok(contestService.deleteContest(id));
    }
}
