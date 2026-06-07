package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.ContestProblem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContestProblemRepository extends JpaRepository<ContestProblem, Long> {

    List<ContestProblem> findByContestIdOrderByProblemOrderAsc(Long contestId);

    Optional<ContestProblem> findByContestIdAndProblemId(Long contestId, Long problemId);

    boolean existsByContestIdAndProblemId(Long contestId, Long problemId);

    /** True if the problem is attached to any contest (usage badge). */
    boolean existsByProblemId(Long problemId);

    /** True if the problem sits in any contest that hasn't ended yet. */
    @Query("SELECT COUNT(cp) > 0 FROM ContestProblem cp " +
           "WHERE cp.problem.id = :problemId AND cp.contest.endTime > :now")
    boolean existsActiveContestAttachment(@Param("problemId") Long problemId,
                                          @Param("now") LocalDateTime now);

    /** True if the problem belongs to any contest that has already started. */
    @Query("SELECT COUNT(cp) > 0 FROM ContestProblem cp " +
           "WHERE cp.problem.id = :problemId AND cp.contest.startTime <= :now")
    boolean existsStartedContestAttachment(@Param("problemId") Long problemId,
                                           @Param("now") LocalDateTime now);
}
