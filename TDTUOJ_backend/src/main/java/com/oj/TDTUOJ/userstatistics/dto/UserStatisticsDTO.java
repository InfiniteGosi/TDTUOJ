package com.oj.TDTUOJ.userstatistics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserStatisticsDTO {
    private Integer problemsSolved;
    private Integer totalSubmissions;
    private Integer acceptedSubmissions;
    private Integer practicePoints;
    private Integer contestPoints;
    private Integer totalPoints;
    private Integer currentRating;
    private Integer maxRating;
    private Double acceptanceRate;
}
