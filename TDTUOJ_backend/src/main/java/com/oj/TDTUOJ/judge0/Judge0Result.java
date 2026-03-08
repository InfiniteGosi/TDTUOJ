package com.oj.TDTUOJ.judge0;

import com.oj.TDTUOJ.common.enums.SubmissionVerdict;

public record Judge0Result(
        SubmissionVerdict verdict,
        String errorMessage,
        Double executionTime,   // in seconds
        Integer memoryUsed      // in KB
) {}