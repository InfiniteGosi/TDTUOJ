package com.oj.TDTUOJ.userDailyActivity.repository;


import com.oj.TDTUOJ.userDailyActivity.entity.UserDailyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** JPA access to per-day activity buckets. */
@Repository
public interface UserDailyActivityRepository extends JpaRepository<UserDailyActivity, Long> {
    // Locate today's bucket so recordSubmission can increment it (or create it if absent).
    Optional<UserDailyActivity> findByUserIdAndActivityDate(Long userId, LocalDate date);

    // Fetch a date-bounded window of buckets to build the heatmap.
    List<UserDailyActivity> findByUserIdAndActivityDateBetween(
            Long userId, LocalDate from, LocalDate to);
}