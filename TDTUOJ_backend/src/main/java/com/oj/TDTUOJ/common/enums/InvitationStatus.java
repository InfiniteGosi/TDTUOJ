package com.oj.TDTUOJ.common.enums;

/**
 * Lifecycle of an organization invitation: outstanding (PENDING), acted on by the invitee
 * (ACCEPTED / REJECTED), or timed out before response (EXPIRED). Stored on the invitation
 * record.
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    EXPIRED
}
