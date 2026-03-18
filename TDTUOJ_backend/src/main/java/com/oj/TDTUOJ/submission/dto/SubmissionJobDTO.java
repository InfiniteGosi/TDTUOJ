package com.oj.TDTUOJ.submission.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubmissionJobDTO {
    private Long               submissionId;
    private Long               problemId;
    private Long               userId;
    private Long               contestId;
    private String             sourceCode;
    private SubmissionLanguage submissionLanguage;
    private Boolean            isPublic;
}