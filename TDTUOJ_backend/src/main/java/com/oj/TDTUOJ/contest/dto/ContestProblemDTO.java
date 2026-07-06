package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * A problem slot inside a contest. On write only {@code problemId}, order and
 * points matter; the {@code problemTitle}/{@code problemSlug}/difficulty fields
 * are denormalized on read for display.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContestProblemDTO {

    private Long id; // ContestProblem row id

    @NotNull(message = "Problem ID is required")
    private Long problemId;

    // Denormalized for display — filled when reading
    private String problemTitle;
    private String problemSlug;
    private ProblemDifficulty problemDifficulty;

    // Contest-specific fields
    private Integer problemOrder;   // display order: 1, 2, 3 → shown as A, B, C in UI
    private Integer points;         // can override the problem's base point
}