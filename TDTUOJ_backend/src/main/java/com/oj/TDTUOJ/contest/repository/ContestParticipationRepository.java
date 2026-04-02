package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestParticipationRepository extends JpaRepository<ContestParticipation, Long> {

    Optional<ContestParticipation> findByContestIdAndUserId(Long contestId, Long userId);

    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    List<ContestParticipation> findByContestIdOrderByRankAsc(Long contestId);

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
