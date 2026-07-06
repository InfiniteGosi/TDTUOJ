package com.oj.TDTUOJ.common.enums;

/**
 * Final judging outcome of a submission, derived from the Judge0 execution result once a
 * submission reaches {@link SubmissionStatus#COMPLETED}. Drives scoring and the verdict
 * shown to the user. (AC = Accepted, WA = Wrong Answer, TLE = Time Limit Exceeded,
 * MLE = Memory Limit Exceeded.)
 */
public enum SubmissionVerdict {
    AC,
    WA,
    CE, // Compilation Error
    TLE,
    MLE,
    SF, // Segmentation Fault
    IE  // Internal/Judge Error — engine unavailable or failed to run
}
