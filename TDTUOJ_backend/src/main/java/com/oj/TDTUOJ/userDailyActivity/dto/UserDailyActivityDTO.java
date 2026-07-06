package com.oj.TDTUOJ.userDailyActivity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDate;

/** A single heatmap cell: one day's submission count for a user. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDailyActivityDTO {
    private LocalDate activityDate;

    private Integer submissionsCount;
}