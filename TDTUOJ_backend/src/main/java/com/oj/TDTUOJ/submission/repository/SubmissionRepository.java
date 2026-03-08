package com.oj.TDTUOJ.submission.repository;

import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.submission.entity.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    Page<Submission> findByUserIdAndProblemId(Long userId, Long problemId, Pageable pageable);

    boolean existsByUserIdAndProblemIdAndSubmissionVerdict(
            Long userId, Long problemId, SubmissionVerdict verdict
    );

    boolean existsByUserIdAndProblemId(Long userId, Long problemId);
}