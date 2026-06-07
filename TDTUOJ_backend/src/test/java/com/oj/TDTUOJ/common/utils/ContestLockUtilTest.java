package com.oj.TDTUOJ.common.utils;

import com.oj.TDTUOJ.contest.entity.Contest;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ContestLockUtilTest {

    private final LocalDateTime now = LocalDateTime.of(2026, 6, 5, 12, 0);

    private Contest contest(LocalDateTime end, boolean rated, boolean processed, Integer freezeMins) {
        return Contest.builder()
                .endTime(end)
                .isRated(rated)
                .ratingProcessed(processed)
                .freezeDurationMinutes(freezeMins)
                .build();
    }

    // ── isLocked ──────────────────────────────────────────────────────────

    @Test
    void nullContest_isNotLocked() {
        assertFalse(ContestLockUtil.isLocked(null, now));
    }

    @Test
    void runningContest_isLocked() {
        assertTrue(ContestLockUtil.isLocked(contest(now.plusHours(1), false, false, null), now));
    }

    @Test
    void endedUnratedContest_isUnlocked() {
        assertFalse(ContestLockUtil.isLocked(contest(now.minusHours(1), false, false, null), now));
    }

    @Test
    void endedRatedContest_ratingPending_isLocked() {
        assertTrue(ContestLockUtil.isLocked(contest(now.minusHours(1), true, false, null), now));
    }

    @Test
    void endedRatedContest_ratingProcessed_isUnlocked() {
        assertFalse(ContestLockUtil.isLocked(contest(now.minusHours(1), true, true, null), now));
    }

    // ── freezeStart ───────────────────────────────────────────────────────

    @Test
    void freezeStart_nullOrZeroDuration_returnsNull() {
        assertNull(ContestLockUtil.freezeStart(contest(now.plusHours(1), false, false, null)));
        assertNull(ContestLockUtil.freezeStart(contest(now.plusHours(1), false, false, 0)));
    }

    @Test
    void freezeStart_isEndMinusDuration() {
        Contest c = contest(now.plusMinutes(30), false, false, 60);
        assertEquals(now.minusMinutes(30), ContestLockUtil.freezeStart(c));
    }

    // ── isFrozen ──────────────────────────────────────────────────────────

    @Test
    void noFreezeConfigured_neverFrozen() {
        assertFalse(ContestLockUtil.isFrozen(contest(now.plusMinutes(10), false, false, null), now));
    }

    @Test
    void beforeFreezeWindow_notFrozen() {
        // ends in 2h, freeze = last 60 min → freeze starts in 1h
        assertFalse(ContestLockUtil.isFrozen(contest(now.plusHours(2), false, false, 60), now));
    }

    @Test
    void insideFreezeWindow_isFrozen() {
        // ends in 30 min, freeze = last 60 min → frozen now
        assertTrue(ContestLockUtil.isFrozen(contest(now.plusMinutes(30), false, false, 60), now));
    }

    @Test
    void endedRated_ratingPending_staysFrozen() {
        assertTrue(ContestLockUtil.isFrozen(contest(now.minusMinutes(5), true, false, 60), now));
    }

    @Test
    void endedUnrated_unfreezesImmediately() {
        assertFalse(ContestLockUtil.isFrozen(contest(now.minusMinutes(5), false, false, 60), now));
    }

    @Test
    void endedRated_ratingProcessed_unfreezes() {
        assertFalse(ContestLockUtil.isFrozen(contest(now.minusMinutes(5), true, true, 60), now));
    }
}
