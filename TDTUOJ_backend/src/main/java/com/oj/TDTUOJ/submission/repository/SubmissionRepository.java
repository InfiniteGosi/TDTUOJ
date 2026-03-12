package com.oj.TDTUOJ.submission.repository;

import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.submission.entity.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    Page<Submission> findByUserIdAndProblemId(Long userId, Long problemId, Pageable pageable);

    boolean existsByUserIdAndProblemIdAndSubmissionVerdict(
            Long userId, Long problemId, SubmissionVerdict verdict
    );

    boolean existsByUserIdAndProblemId(Long userId, Long problemId);

    // Fix 1: count prior AC submissions excluding the one just saved,
    // so the current submission never counts against itself.
    long countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
            Long userId, Long problemId, SubmissionVerdict verdict, Long excludeId
    );

    // Fix 2: full (unpaged) list used by the backfill path in UserStatisticsServiceImpl.
    List<Submission> findAllByUserId(Long userId);
}