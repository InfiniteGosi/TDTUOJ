package com.oj.TDTUOJ.common.enums;

/**
 * Lifecycle stage of a submission as it moves through the async judging pipeline:
 * queued (PENDING), being executed on Judge0 (RUNNING), then finished (COMPLETED).
 * Distinct from {@link SubmissionVerdict}, which captures the outcome once COMPLETED.
 */
public enum SubmissionStatus {
    PENDING,
    RUNNING,
    COMPLETED
}
