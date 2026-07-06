package com.oj.TDTUOJ.common.enums;

/**
 * How a user took part in a contest: as a live CONTESTANT (counts toward official standings
 * and rating) or in VIRTUAL mode after the contest ended (practice, excluded from official
 * ranking). Recorded on a contest registration/participation record.
 */
public enum ContestParticipationType {
    CONTESTANT,   // registered and participated during the live contest
    VIRTUAL       // participated after contest ended in virtual mode
}