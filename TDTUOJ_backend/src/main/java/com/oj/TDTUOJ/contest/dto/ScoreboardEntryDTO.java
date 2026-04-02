package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ContestParticipationType;
import lombok.Data;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScoreboardEntryDTO {

    private Integer rank;

    private Long userId;
    private String username;
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