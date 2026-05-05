package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemStatsDTO {

    private Long    problemId;
    private String  problemTitle;
    private String  problemSlug;
    private Integer problemOrder;   // 1=A, 2=B, …

    // Verdict counts
    private Integer totalSubmissions;
    private Integer acCount;
    private Integer waCount;
    private Integer tleCount;
    private Integer ceCount;
    private Integer mleCount;
    private Integer sfCount;
    private Integer pendingCount;   // PENDING + RUNNING (not yet judged)

    /** Acceptance rate 0–100, rounded to one decimal. */
    private Double  acRate;
}
