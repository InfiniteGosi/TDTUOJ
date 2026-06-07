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

    private ContestLockUtil() {}

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

    public static boolean isFrozen(Contest contest, LocalDateTime now) {
        LocalDateTime start = freezeStart(contest);
        if (start == null) return false;
        return !now.isBefore(start) && isLocked(contest, now);
    }
}
