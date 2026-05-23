package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.RatingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RatingHistoryRepository extends JpaRepository<RatingHistory, Long> {

    /** Profile page: show rating history newest first. ID as tiebreaker for same-timestamp entries. */
    List<RatingHistory> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    /** Idempotency guard: prevent double-processing. */
    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    /** Find all rating entries for a contest (used for rollback on reprocess). */
    List<RatingHistory> findByContestId(Long contestId);
}
