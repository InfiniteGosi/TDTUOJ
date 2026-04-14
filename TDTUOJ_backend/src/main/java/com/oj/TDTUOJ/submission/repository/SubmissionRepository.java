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

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    /** Returns true if any submission for the contest is still PENDING or RUNNING. */
    boolean existsByContestIdAndSubmissionStatusIn(Long contestId, Collection<SubmissionStatus> statuses);
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    Page<Submission> findByUserIdAndProblemId(Long userId, Long problemId, Pageable pageable);

    boolean existsByUserIdAndProblemIdAndSubmissionVerdict(
            Long userId, Long problemId, SubmissionVerdict verdict
    );

    boolean existsByUserIdAndProblemId(Long userId, Long problemId);

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
}