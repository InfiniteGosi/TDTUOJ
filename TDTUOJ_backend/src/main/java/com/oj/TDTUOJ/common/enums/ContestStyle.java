package com.oj.TDTUOJ.common.enums;


/**
 * Scoring rules for a contest, set on the {@code Contest} entity and used by leaderboard
 * ranking. ICPC = penalty-based (solved count then time+penalty); IOI = points-based
 * (partial per-testcase scoring).
 */
public enum ContestStyle {
    ICPC,
    IOI,
}
