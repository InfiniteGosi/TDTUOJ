package com.oj.TDTUOJ.submission.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubmissionDTO {
    private Long id;

    private String sourceCode;

    private Double memoryUsed;

    private Integer executionTime;

    private SubmissionStatus submissionStatus;

    private SubmissionVerdict submissionVerdict;

    private SubmissionLanguage submissionLanguage;

    private LocalDateTime submissionDate;

    private Integer testCasesPassed;

    private Integer totalTestCases;

    private String errorMessage;

    private Boolean isPublic;

    private Long problemId;
    
    private Long userId;

    private Long contestId;

    private Integer queuePosition;
}