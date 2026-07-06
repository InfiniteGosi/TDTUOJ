package com.oj.TDTUOJ.lab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API view of a single lab exercise. Solution fields are only filled in once the
 * lab owner publishes solutions; the per-student status fields are only filled
 * in for an authenticated caller.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LabExerciseDTO {
    private Long id;
    private Integer exerciseOrder;
    private Integer points;

    // Problem info
    private Long problemId;
    private String problemTitle;
    private String problemSlug;
    private String problemDifficulty;

    // Solution (only visible when lab.solutionsPublished = true)
    private String solutionFileUrl;
    private String solutionCode;
    private String solutionLanguage;

    // Student's status for this exercise (SOLVED, ATTEMPTED, NOT_STARTED)
    private String status;
    private Integer submissionCount;
    private String bestVerdict;
}
