package com.oj.TDTUOJ.submission.repository;

import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.submission.entity.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * Data access for {@link Submission}. Beyond basic CRUD it backs several distinct callers:
 * the judging/scoring paths (global vs. contest-scoped AC/WA counts, excluding the current row),
 * public-profile feeds (which must hide submissions to still-locked contests), lab progress,
 * the contest monitor, per-language stats, and admin dashboard aggregates. Query-method names
 * and the handful of {@code @Query} definitions encode those filters.
 */
@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    /** Returns true if any submission for the contest is still PENDING or RUNNING. */
    boolean existsByContestIdAndSubmissionStatusIn(Long contestId, Collection<SubmissionStatus> statuses);
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    /**
     * Public-profile feed: a user's submissions EXCLUDING those that belong to
     * a locked contest (running/upcoming, or ended-rated with rating not yet
     * processed). Mirrors ContestLockUtil.isLocked — keep in sync.
     * NOT EXISTS (rather than IN) so submissions whose contest was deleted
     * stay visible.
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT s FROM Submission s WHERE s.userId = :userId " +
        "AND (s.contestId IS NULL OR NOT EXISTS (" +
        "  SELECT c FROM com.oj.TDTUOJ.contest.entity.Contest c WHERE c.id = s.contestId " +
        "  AND (c.endTime >= :now OR (c.isRated = true AND c.ratingProcessed = false))))"
    )
    Page<Submission> findVisibleByUserId(
        @org.springframework.data.repository.query.Param("userId") Long userId,
        @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
        Pageable pageable);

    Page<Submission> findByUserIdAndProblemId(Long userId, Long problemId, Pageable pageable);

    boolean existsByUserIdAndProblemIdAndSubmissionVerdict(
            Long userId, Long problemId, SubmissionVerdict verdict
    );

    boolean existsByUserIdAndProblemId(Long userId, Long problemId);

    /**
     * True if anyone OTHER than the given user has submitted to this problem.
     * Contest-fairness: a problem with foreign submissions is not contest-eligible.
     */
    boolean existsByProblemIdAndUserIdNot(Long problemId, Long userId);

    // Global count (used by practice / statistics paths — no contest filter)
    long countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
            Long userId, Long problemId, SubmissionVerdict verdict, Long excludeId
    );

    // Contest-scoped: count prior AC submissions for a problem within a specific contest,
    // excluding the submission just saved so it doesn't count against itself.
    long countByUserIdAndProblemIdAndContestIdAndSubmissionVerdictAndIdNot(
            Long userId, Long problemId, Long contestId, SubmissionVerdict verdict, Long excludeId
    );

    // Contest-scoped: count WA submissions for a problem within a specific contest.
    long countByUserIdAndProblemIdAndContestIdAndSubmissionVerdict(
            Long userId, Long problemId, Long contestId, SubmissionVerdict verdict
    );

    // Full (unpaged) list used by the backfill path in UserStatisticsServiceImpl.
    List<Submission> findAllByUserId(Long userId);

    // ── Lab-scoped queries ────────────────────────────────────────────────── //

    /** All submissions by a user for a problem within a specific lab. */
    List<Submission> findByUserIdAndProblemIdAndLabId(Long userId, Long problemId, Long labId);

    /** Check if user has an AC submission for a problem in a lab. */
    boolean existsByUserIdAndProblemIdAndLabIdAndSubmissionVerdict(
            Long userId, Long problemId, Long labId, SubmissionVerdict verdict);

    /** Count submissions for a problem within a lab. */
    long countByUserIdAndProblemIdAndLabId(Long userId, Long problemId, Long labId);

    // ── Contest monitor queries ───────────────────────────────────────────── //

    /** All submissions for a contest — used to compute problem/participant stats. */
    List<Submission> findByContestId(Long contestId);

    /** Count total submissions for a contest. */
    long countByContestId(Long contestId);

    /** Count submissions with given statuses (PENDING/RUNNING) in a contest. */
    long countByContestIdAndSubmissionStatusIn(Long contestId, Collection<SubmissionStatus> statuses);

    /**
     * All submissions by a specific user in a contest, newest first.
     * Admin code viewer: returns submissions across ALL problems for that user.
     */
    List<Submission> findByContestIdAndUserIdOrderBySubmissionDateDesc(Long contestId, Long userId);

    /**
     * All submissions by a user for a specific problem in a contest, newest first.
     * Admin drills into (user, problem) pair.
     */
    List<Submission> findByContestIdAndUserIdAndProblemIdOrderBySubmissionDateDesc(
            Long contestId, Long userId, Long problemId);

    // ── Language stats ───────────────────────────────────────────────────── //

    /** AC submission counts grouped by language for a user. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT s.submissionLanguage, COUNT(s) FROM Submission s " +
        "WHERE s.userId = :userId " +
        "AND s.submissionVerdict = com.oj.TDTUOJ.common.enums.SubmissionVerdict.AC " +
        "GROUP BY s.submissionLanguage"
    )
    List<Object[]> countAcByLanguage(@org.springframework.data.repository.query.Param("userId") Long userId);

    // ── Admin dashboard aggregates ───────────────────────────────────────── //

    /** Submission counts grouped by verdict, platform-wide (admin dashboard). */
    @org.springframework.data.jpa.repository.Query(
        "SELECT s.submissionVerdict, COUNT(s) FROM Submission s " +
        "WHERE s.submissionVerdict IS NOT NULL " +
        "GROUP BY s.submissionVerdict"
    )
    List<Object[]> countGroupedByVerdict();

    /** Submissions per day ("YYYY-MM-DD") since a given time (admin dashboard). */
    @org.springframework.data.jpa.repository.Query(
        "SELECT FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD'), COUNT(s) FROM Submission s " +
        "WHERE s.submissionDate >= :since " +
        "GROUP BY FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD') " +
        "ORDER BY FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD')"
    )
    List<Object[]> countSubmissionsByDay(
        @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);

    /** Submissions per day ("YYYY-MM-DD") across all time (admin dashboard). */
    @org.springframework.data.jpa.repository.Query(
        "SELECT FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD'), COUNT(s) FROM Submission s " +
        "GROUP BY FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD') " +
        "ORDER BY FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD')"
    )
    List<Object[]> countAllSubmissionsByDay();

    /** Earliest submission timestamp — start of the all-time series. */
    @org.springframework.data.jpa.repository.Query("SELECT MIN(s.submissionDate) FROM Submission s")
    java.time.LocalDateTime findEarliestSubmissionDate();
}