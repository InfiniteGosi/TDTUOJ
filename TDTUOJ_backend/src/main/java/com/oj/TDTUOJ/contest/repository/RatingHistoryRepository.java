package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.RatingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RatingHistoryRepository extends JpaRepository<RatingHistory, Long> {

    /** Profile page: show rating history newest first. */
    List<RatingHistory> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Idempotency guard: prevent double-processing. */
    boolean existsByContestIdAndUserId(Long contestId, Long userId);
}
