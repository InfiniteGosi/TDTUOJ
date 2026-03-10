package com.oj.TDTUOJ.UserDailyActivity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDate;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDailyActivityDTO {
    private LocalDate activityDate;

    private Integer submissionsCount;
}