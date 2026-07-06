package com.oj.TDTUOJ.lab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/** Request body for creating or updating a lab, including its ordered list of exercises. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateLabRequest {

    @NotBlank(message = "Lab title is required")
    private String title;

    private String description;

    private LocalDateTime deadline;

    /** List of problem IDs to include as exercises, in order. */
    private List<ExerciseEntry> exercises;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExerciseEntry {
        private Long problemId;
        private Integer points;
    }
}
