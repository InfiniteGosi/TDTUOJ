package com.oj.TDTUOJ.userdailyactivity.repository;


import com.oj.TDTUOJ.userdailyactivity.entity.UserDailyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDailyActivityRepository extends JpaRepository<UserDailyActivity, Long> {
    Optional<UserDailyActivity> findByUserIdAndActivityDate(Long userId, LocalDate date);

    List<UserDailyActivity> findByUserIdAndActivityDateBetween(
            Long userId, LocalDate from, LocalDate to);
}