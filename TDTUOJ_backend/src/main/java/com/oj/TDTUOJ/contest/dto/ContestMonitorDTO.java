package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Top-level payload returned by GET /api/contests/{id}/monitor.
 * All fields computed from the submissions table — no extra schema needed.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContestMonitorDTO {

    private Long   contestId;
    private String contestName;
    private String contestSlug;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    /** Total number of registered participants. */
    private Integer totalRegistered;

    /** Number of distinct users who have submitted at least once. */
    private Integer totalActiveParticipants;

    /** All submissions (any status) for this contest. */
    private Integer totalSubmissions;

    /** Submissions still in PENDING or RUNNING state. */
    private Integer pendingSubmissions;

    /** Stats broken down per problem (ordered by problemOrder asc). */
    private List<ProblemStatsDTO> problemStats;

    /** Stats broken down per participant (ordered by lastSubmissionTime desc). */
    private List<ParticipantStatsDTO> participantStats;

    private LocalDateTime lastUpdated;
}
