package com.oj.TDTUOJ.common.utils;

import com.oj.TDTUOJ.contest.entity.Contest;

import java.time.LocalDateTime;

/**
 * Single source of truth for contest-fairness visibility rules.
 *
 * <p><b>locked</b>  — the contest's submissions are hidden from everyone except
 * the owner, ADMINs, and the contest creator. A contest is locked while it is
 * running/upcoming, and (if rated) until {@code ratingProcessed} flips to true.
 *
 * <p><b>frozen</b>  — the public scoreboard stops updating. Active from
 * {@code endTime - freezeDurationMinutes} until the contest unlocks.
 *
 * <p>The JPQL predicate in {@code SubmissionRepository.findVisibleByUserId}
 * mirrors {@link #isLocked} — keep them in sync.
 */
public final class ContestLockUtil {

    private ContestLockUtil() {} // static-only helper; never instantiated

    /**
     * Whether a contest's submissions must stay hidden from ordinary users right now.
     *
     * <p>Locked while running/upcoming, and — for rated contests — kept locked after the end
     * time until ratings are processed, so results aren't leaked before the official recalc.
     */
    public static boolean isLocked(Contest contest, LocalDateTime now) {
        if (contest == null) return false; // contest deleted → nothing left to protect
        if (contest.getEndTime() == null || !contest.getEndTime().isBefore(now)) {
            return true; // running or upcoming
        }
        boolean rated = Boolean.TRUE.equals(contest.getIsRated());
        return rated && !Boolean.TRUE.equals(contest.getRatingProcessed());
    }

    /** Start of the freeze window, or null when no freeze is configured. */
    public static LocalDateTime freezeStart(Contest contest) {
        Integer mins = contest.getFreezeDurationMinutes();
        if (mins == null || mins <= 0 || contest.getEndTime() == null) return null;
        return contest.getEndTime().minusMinutes(mins);
    }

    /**
     * Whether the public scoreboard should be frozen (stop updating) right now.
     *
     * <p>True once we are past the freeze start AND the contest is still locked — the extra
     * {@link #isLocked} check ensures the board automatically thaws the moment the contest
     * unlocks, rather than staying frozen forever after the end time.
     */
    public static boolean isFrozen(Contest contest, LocalDateTime now) {
        LocalDateTime start = freezeStart(contest);
        if (start == null) return false;
        return !now.isBefore(start) && isLocked(contest, now);
    }
}
