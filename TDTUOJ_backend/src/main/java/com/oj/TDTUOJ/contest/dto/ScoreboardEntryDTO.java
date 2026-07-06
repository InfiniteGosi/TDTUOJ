package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ContestParticipationType;
import lombok.Data;

import java.util.List;

/**
 * One row of the leaderboard: a participant's rank, aggregate score and the
 * per-problem breakdown ({@link ProblemScoreDTO}) that fills the scoreboard grid.
 * Built from the Redis meta/problem hashes, with display fields refreshed live
 * from the DB.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScoreboardEntryDTO {

    private Integer rank;

    private Long userId;
    private String username;   // immutable login slug — used for profile routing
    private String name;       // display name — may change; resolved live for display
    private String profileUrl;

    private Integer score;
    private Integer penaltyTime;    // total penalty in minutes (ICPC) or 0 (IOI)
    private Integer problemsSolved;
    private Integer pointsEarned;

    private ContestParticipationType type;

    // Per-problem status for the scoreboard grid
    // Index matches contestProblem.problemOrder
    private List<ProblemScoreDTO> problemScores;

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ProblemScoreDTO {
        private Long problemId;
        private Integer problemOrder;
        private Boolean solved;
        private Integer attempts;       // wrong attempts before AC
        private Integer penaltyMinutes; // minutes from contest start to first AC
        private Integer pointsEarned;   // for IOI partial scoring
    }
}