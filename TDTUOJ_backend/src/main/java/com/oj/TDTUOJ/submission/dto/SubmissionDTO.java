package com.oj.TDTUOJ.submission.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * API-facing view of a submission, used both as the create-submission request body and as the
 * status/result response. On create, clients supply source code, language, problem and optional
 * contest/lab ids; on read, the judged fields (verdict, status, timing, test-case counts) are
 * populated. {@code queuePosition} is transient — set only while a submission is still PENDING.
 */
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

    private Long labId;

    private Integer queuePosition;
}