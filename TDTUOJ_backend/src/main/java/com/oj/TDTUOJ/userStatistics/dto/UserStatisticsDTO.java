package com.oj.TDTUOJ.userStatistics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/** Read-only projection of {@link com.oj.TDTUOJ.userStatistics.entity.UserStatistics} for the profile stats panel. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserStatisticsDTO {
    private Integer problemsSolved;
    private Integer totalSubmissions;
    private Integer acceptedSubmissions;
    private Integer totalPoints;
    private Integer currentRating;
    private Integer maxRating;
    private Double acceptanceRate;
}
