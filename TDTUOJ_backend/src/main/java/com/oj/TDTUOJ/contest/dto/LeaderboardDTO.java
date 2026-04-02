package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Full leaderboard response returned by {@code GET /api/contests/{id}/leaderboard}.
 * The {@code entries} list is ordered by rank (ascending) as returned from the
 * Redis ZSET ZREVRANGE.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class LeaderboardDTO {

    private Long   contestId;
    private String contestName;
    private String contestSlug;

    /** Total number of participants who have at least one submission. */
    private Integer totalParticipants;

    /** Ordered list starting from rank 1. */
    private List<ScoreboardEntryDTO> entries;

    /** Timestamp of the last score update — used by clients for polling. */
    private LocalDateTime lastUpdated;
}
