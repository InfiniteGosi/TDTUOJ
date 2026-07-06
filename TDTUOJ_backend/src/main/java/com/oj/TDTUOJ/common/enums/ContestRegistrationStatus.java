package com.oj.TDTUOJ.common.enums;

/**
 * State of a user's request to join a contest, supporting an approval workflow for
 * private/organization contests: awaiting review (PENDING), admitted (APPROVED), denied
 * (REJECTED), or withdrawn by the user (CANCELLED).
 */
public enum ContestRegistrationStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED
}