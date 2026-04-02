package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ContestStatus;
import com.oj.TDTUOJ.common.enums.ContestStyle;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContestDTO {

    private Long id;

    @NotBlank(message = "Contest name is required")
    private String name;

    private String description;

    private String slug;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    private Boolean isPublic;

    private Boolean isRated;

    private Integer maxParticipant;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationEnd;

    private ContestStyle contestStyle;

    // Derived — not stored, computed from startTime/endTime vs now
    private ContestStatus status;

    // Creator info
    private Long creatorId;
    private String creatorUsername;

    // Summary counts for list view
    private Integer totalProblems;
    private Integer totalParticipants;

    // Problems attached to this contest (used in detail view & create/update)
    private List<ContestProblemDTO> problems;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}