package com.oj.TDTUOJ.userDailyActivity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * One row per (user, calendar day) holding that day's submission tally. These
 * rows are the source data for the GitHub-style activity heatmap on user
 * profiles. The unique (user_id, activity_date) constraint guarantees a single
 * bucket per day so counts are accumulated rather than duplicated.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_daily_activity",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "activity_date"}))
public class UserDailyActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // The calendar day this bucket counts (no time component — heatmap granularity is a day).
    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    // Number of submissions the user made on activityDate; drives the heatmap cell intensity.
    @Column(nullable = false)
    @Builder.Default
    private Integer submissionsCount = 0;
}