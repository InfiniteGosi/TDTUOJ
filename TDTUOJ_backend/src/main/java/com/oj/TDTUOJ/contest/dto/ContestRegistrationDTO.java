package com.oj.TDTUOJ.contest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import lombok.Data;

import java.time.LocalDateTime;

/** Read view of a {@link com.oj.TDTUOJ.contest.entity.ContestRegistration} row. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContestRegistrationDTO {

    private Long id;

    private Long contestId;
    private String contestName;

    private Long userId;
    private String username;

    private LocalDateTime registerAt;

    private ContestRegistrationStatus status;
}