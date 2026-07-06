package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Data access for {@link ContestParticipation} — the durable mirror of the Redis
 * leaderboard. The JOIN FETCH variant avoids N+1 loads when the rating job walks
 * every participant, and the bulk {@code updateScoreAndRank} persists the ranking
 * asynchronously after Redis re-ranks.
 */
@Repository
public interface ContestParticipationRepository extends JpaRepository<ContestParticipation, Long> {

    Optional<ContestParticipation> findByContestIdAndUserId(Long contestId, Long userId);

    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    List<ContestParticipation> findByContestIdOrderByRankAsc(Long contestId);

    /** Eagerly loads User to avoid N+1 when computing ratings. */
    @Query("SELECT cp FROM ContestParticipation cp JOIN FETCH cp.user WHERE cp.contest.id = :contestId ORDER BY cp.rank ASC")
    List<ContestParticipation> findByContestIdWithUserOrderByRankAsc(@Param("contestId") Long contestId);

    /**
     * Bulk-update ranks in DB after Redis re-ranks the leaderboard.
     * Called asynchronously after leaderboard invalidation.
     */
    @Modifying
    @Query("UPDATE ContestParticipation cp SET cp.rank = :rank, cp.score = :score, " +
           "cp.penaltyTime = :penalty, cp.problemsSolved = :solved " +
           "WHERE cp.contest.id = :contestId AND cp.user.id = :userId")
    void updateScoreAndRank(
            @Param("contestId")  Long    contestId,
            @Param("userId")     Long    userId,
            @Param("rank")       Integer rank,
            @Param("score")      Integer score,
            @Param("penalty")    Integer penalty,
            @Param("solved")     Integer solved
    );
}
