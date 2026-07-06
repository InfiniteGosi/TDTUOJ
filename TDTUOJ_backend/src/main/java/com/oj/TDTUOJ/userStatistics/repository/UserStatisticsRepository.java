package com.oj.TDTUOJ.userStatistics.repository;

import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** JPA access to per-user {@link UserStatistics} rows. */
@Repository
public interface UserStatisticsRepository extends JpaRepository<UserStatistics, Long> {
    Optional<UserStatistics> findByUserId(Long userId);
    // Batch fetch for leaderboards/lists to avoid N+1 lookups by user id.
    List<UserStatistics> findAllByUserIdIn(List<Long> userIds);

    /** Top solvers leaderboard (admin dashboard). */
    List<UserStatistics> findTop10ByOrderByProblemsSolvedDescAcceptedSubmissionsDesc();
}
