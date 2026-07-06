package com.oj.TDTUOJ.lab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One student's progress across a whole lab, used by the owner's progress table
 * and the CSV/XLSX export. Holds a per-exercise status list plus roll-up
 * counts (solved count, earned vs. total points).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LabProgressDTO {
    private Long userId;
    private String username;
    private String name;

    // Per-exercise status: index matches exercise order
    private List<ExerciseStatus> exerciseStatuses;
    private int solvedCount;
    private int totalPoints;
    private int earnedPoints;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ExerciseStatus {
        private Long exerciseId;
        private String status; // SOLVED, ATTEMPTED, NOT_STARTED
        private Integer submissionCount;
        private String bestVerdict;
    }
}
