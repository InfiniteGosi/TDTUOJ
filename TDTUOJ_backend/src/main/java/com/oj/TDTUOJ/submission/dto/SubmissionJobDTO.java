package com.oj.TDTUOJ.submission.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Self-contained work item carried through the Redis judging queue.
 *
 * <p>Holds everything the worker needs to judge a submission (the source code and language are
 * embedded so the worker never has to re-read the {@code Submission} row). It is serialized to
 * and from Redis, hence the Jackson annotations: {@code NON_NULL} keeps the payload small and
 * {@code ignoreUnknown} keeps deserialization forward-compatible if fields are added later.
 */
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