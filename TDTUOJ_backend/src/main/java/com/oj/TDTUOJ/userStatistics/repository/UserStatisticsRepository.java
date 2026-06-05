package com.oj.TDTUOJ.userStatistics.repository;

import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserStatisticsRepository extends JpaRepository<UserStatistics, Long> {
    Optional<UserStatistics> findByUserId(Long userId);
    List<UserStatistics> findAllByUserIdIn(List<Long> userIds);

    /** Top solvers leaderboard (admin dashboard). */
    List<UserStatistics> findTop10ByOrderByProblemsSolvedDescAcceptedSubmissionsDesc();
}
