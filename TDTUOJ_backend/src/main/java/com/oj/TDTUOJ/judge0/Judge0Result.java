package com.oj.TDTUOJ.judge0;

import com.oj.TDTUOJ.common.enums.SubmissionVerdict;

/**
 * Immutable outcome of a single Judge0 execution, normalized from the raw
 * Judge0 JSON response into the domain's {@link SubmissionVerdict} plus the
 * resource metrics the submission workflow records.
 *
 * @param verdict       mapped verdict (AC/WA/TLE/CE/SF/…) derived from Judge0's status id
 * @param errorMessage  compile output or stderr when the run failed; {@code null} on success
 * @param executionTime wall/CPU time in seconds as reported by Judge0 ({@code null} if absent)
 * @param memoryUsed    peak memory in KB as reported by Judge0 ({@code null} if absent)
 */
public record Judge0Result(
        SubmissionVerdict verdict,
        String errorMessage,
        Double executionTime,   // in seconds
        Integer memoryUsed      // in KB
) {}