package com.oj.TDTUOJ.common.enums;

/**
 * Time-derived phase of a contest relative to now. Computed from the contest's start/end
 * times (not persisted as authoritative state) and used to gate registration, submissions
 * and scoreboard visibility.
 */
public enum ContestStatus {
    UPCOMING,   // before startTime
    ONGOING,    // between startTime and endTime
    ENDED       // after endTime
}