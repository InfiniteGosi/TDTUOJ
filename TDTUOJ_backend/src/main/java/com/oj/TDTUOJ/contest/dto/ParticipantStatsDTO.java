package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParticipantStatsDTO {

    private Long           userId;
    private String         username;
    private String         profileUrl;

    private Integer        totalSubmissions;
    private Integer        problemsSolved;    // distinct problems with ≥1 AC

    /** Time of the participant's most recent submission in this contest. */
    private LocalDateTime  lastSubmissionTime;
}
