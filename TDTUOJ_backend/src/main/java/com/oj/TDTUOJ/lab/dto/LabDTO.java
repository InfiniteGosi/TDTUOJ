package com.oj.TDTUOJ.lab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LabDTO {
    private Long id;
    private Long organizationId;
    private String title;
    private String slug;
    private String description;
    private LocalDateTime deadline;
    private Boolean solutionsPublished;
    private String creatorUsername;
    private int exerciseCount;
    private int totalPoints;

    // Student-specific: how many they solved
    private Integer solvedCount;
    private Integer attemptedCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Only populated in detail view
    private List<LabExerciseDTO> exercises;
}
