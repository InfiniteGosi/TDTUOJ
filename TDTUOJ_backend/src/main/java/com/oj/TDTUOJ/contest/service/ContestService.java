package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.ContestDTO;
import com.oj.TDTUOJ.contest.dto.ContestMonitorDTO;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface ContestService {

    Response<Page<ContestDTO>> getPublicContests(int page, int size, String search);

    Response<ContestDTO> getContestBySlug(String slug);

    Response<ContestDTO> getContestById(Long id);

    Response<ContestDTO> createContest(ContestDTO dto);

    Response<ContestDTO> updateContest(Long id, ContestDTO dto);

    Response<Void> deleteContest(Long id);

    /** Register the currently authenticated user for a contest. */
    Response<Void> registerForContest(Long contestId);

    /** Unregister the currently authenticated user from a contest (only before start). */
    Response<Void> unregisterFromContest(Long contestId);

    /** Check whether the currently authenticated user is already registered. */
    Response<Boolean> isRegisteredForContest(Long contestId);

    /** Return the full ICPC leaderboard (paginated). */
    Response<LeaderboardDTO> getLeaderboard(Long contestId, int page, int size);

    /** Return the calling user's rank and neighbours. */
    Response<List<ScoreboardEntryDTO>> getMyRank(Long contestId, int window);

    // ── Admin monitor ────────────────────────────────────────────────────── //

    /**
     * Returns real-time problem and participant statistics for a contest.
     * Caller must be ADMIN or the contest CREATOR.
     */
    Response<ContestMonitorDTO> getContestMonitor(Long contestId);

    /**
     * Returns all submissions by a participant in a contest (newest first).
     * Optionally filtered to a single problem when problemId is non-null.
     * Caller must be ADMIN or the contest CREATOR.
     */
    Response<List<SubmissionDTO>> getParticipantSubmissions(
            Long contestId, Long userId, Long problemId);
}
