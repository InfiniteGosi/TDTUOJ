package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/** Read view of a {@link com.oj.TDTUOJ.contest.entity.RatingHistory} row for the profile page. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class RatingHistoryDTO {

    private Long id;

    private Long userId;
    private String username;

    private Long contestId;
    private String contestName;

    private Integer oldRating;
    private Integer newRating;
    private Integer ratingChange;   // positive = gained, negative = lost

    private Integer rank;

    private LocalDateTime createdAt;

    private LocalDateTime contestEndTime;
}