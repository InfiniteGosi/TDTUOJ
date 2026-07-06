package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.RatingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Data access for {@link RatingHistory}. The "chain walk" finders let the rating
 * service resolve a user's prior rating and rewrite every downstream row so the
 * {@code oldRating == previousRow.newRating} invariant holds after (re)processing.
 */
@Repository
public interface RatingHistoryRepository extends JpaRepository<RatingHistory, Long> {

    /** Profile page: show rating history by contest end time, newest first. ID as tiebreaker. */
    List<RatingHistory> findByUserIdOrderByContestEndTimeDescIdDesc(Long userId);

    /** Idempotency guard: prevent double-processing. */
    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    /** Find all rating entries for a contest (used for rollback on reprocess). */
    List<RatingHistory> findByContestId(Long contestId);

    /** Chain walk: enumerate user's rows in chronological order (asc). */
    List<RatingHistory> findByUserIdOrderByContestEndTimeAscIdAsc(Long userId);

    /** Chain walk: rows strictly after a given end-time (used for downstream rewrite). */
    List<RatingHistory> findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(
            Long userId, LocalDateTime endTime);

    /** Chain lookup: prior row by end-time for deriving oldRating before formula. */
    Optional<RatingHistory> findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(
            Long userId, LocalDateTime endTime);
}
