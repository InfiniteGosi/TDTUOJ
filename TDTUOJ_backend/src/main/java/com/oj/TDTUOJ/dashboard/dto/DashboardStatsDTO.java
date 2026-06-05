package com.oj.TDTUOJ.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Aggregate payload for the admin analytics dashboard.
 * Returned in one round-trip by GET /api/admin/dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    private Totals totals;
    private List<NameCount> problemsByDifficulty;
    private List<NameCount> problemsByTag;
    private List<TimePoint> usersOverTime;
    private List<TimePoint> submissionsOverTime;
    private List<NameCount> verdictDistribution;
    private List<TopSolverDTO> topSolvers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Totals {
        private long problems;
        private long users;
        private long submissions;
        private long contests;
        private long organizations;
    }

    /** Generic (label, count) pair for pie/bar breakdowns. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NameCount {
        private String name;
        private long value;
    }

    /** Time-series point. {@code cumulative} is only set for the users-over-time series. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimePoint {
        private String period;   // "YYYY-MM" (users) or "YYYY-MM-DD" (submissions)
        private long count;
        private Long cumulative; // running total — null for submission series
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopSolverDTO {
        private Long userId;
        private String username;
        private String name;
        private String profileUrl;
        private Integer problemsSolved;
        private Double acceptanceRate;
        private Integer currentRating;
    }
}
