# Contest Fairness — Submission Privacy + Scoreboard Freeze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** During a live contest, a participant's contest submissions must be invisible to everyone except the owner, admins, and the contest creator — until the contest ends and (for rated contests) the final ranking is computed. Additionally, implement an ICPC-style scoreboard freeze for the last N minutes of a contest.

**Architecture:** *Computed visibility* (Approach A, approved in design): no new state on `Submission`. A submission is hidden iff its contest is "locked" — derived from `Contest.endTime`, `Contest.isRated`, and the existing `Contest.ratingProcessed` flag. Enforced server-side in two leak paths: the public profile feed (`GET /api/users/{username}/submissions` — repository-level JPQL filter, so pagination stays correct) and the submission-detail endpoint (`GET /api/submissions/{id}/status` — service-level guard). Scoreboard freeze adds a nullable `Contest.freezeDurationMinutes`; during the freeze window non-privileged viewers are served a *frozen snapshot* of the leaderboard (last board built before the freeze started, stored in Redis), while admins/creator keep seeing the live board. Unlock is automatic: the moment `ratingProcessed` flips in the existing `ContestRatingService.processRatings()` (or `endTime` passes for unrated contests), all predicates evaluate to "unlocked" — no batch job, no data migration.

**Tech Stack:** Spring Boot 3.5 / Spring Data JPA (JPQL subquery) / Spring Security 6 (`SecurityContextHolder` via existing `UserService.getCurrentLoggedInUser()`), Redis (`RedisTemplate`, existing leaderboard keys), JUnit 5 + Mockito (existing test harness in `src/test`), React 19 frontend. No new dependencies. PostgreSQL schema change is one nullable column, applied automatically by `ddl-auto: update`.

---

## Part 0 — Background: how real platforms ensure contest fairness

This section answers the research questions that motivated the feature, mapped to the TDTUOJ codebase. Implementation tasks start at Part 1.

### 0.1 Storage vs. visibility

Platforms **never delete or quarantine** submission rows during a contest. Codeforces and LeetCode write every submission into one append-only `submissions` table immediately (judging needs it, anti-cheat needs it, the standings aggregation needs it). What changes during a contest is purely the **read path**: every API/page that serves submission data applies a *visibility predicate* before returning rows.

```
            WRITE PATH (always on)                READ PATH (predicate-gated)
 user ──▶ POST /submit ──▶ submissions table ──▶ judge worker ──▶ verdict update
                                  │
                                  ├──▶ GET /profile/{u}/submissions   ──▶ [visibility filter] ──▶ viewer
                                  ├──▶ GET /submission/{id}           ──▶ [visibility filter] ──▶ viewer
                                  └──▶ GET /contest/{c}/standings     ──▶ [aggregate + freeze] ──▶ viewer
```

Conceptually:

```python
def can_view(submission, viewer, now):
    if submission.contest_id is None:           return True       # practice
    contest = contests[submission.contest_id]
    if not contest.is_locked(now):              return True       # finished + finalized
    return viewer is not None and (
        viewer.id == submission.user_id          # owner
        or viewer.is_admin
        or viewer.id == contest.creator_id)
```

Key insight: the predicate must be based on the **target's** submission state, not the **viewer's** registration. A viewer-based rule ("hide from co-registered participants") is defeated by logging out — TDTUOJ's profile endpoint is public/unauthenticated, so the rule here is *owner/admin/creator or nobody* while locked.

### 0.2 Raw submissions table vs. standings aggregate

The scoreboard is **never** computed per-request from the raw table at scale. It's an incrementally-maintained aggregate:

```
 submissions (raw, row per attempt)        standings (aggregate, row per (user, contest))
 ┌────┬──────┬─────────┬─────────┐         ┌──────┬─────────┬────────┬─────────┐
 │ id │ user │ problem │ verdict │  ──▶    │ user │ solved  │ penalty│ rank    │
 │ 1  │ A    │ P1      │ WA      │ on AC   │ A    │ 2       │ 153    │ 4       │
 │ 2  │ A    │ P1      │ AC      │ event   │ B    │ 3       │ 97     │ 1       │
 └────┴──────┴─────────┴─────────┘         └──────┴─────────┴────────┴─────────┘
```

TDTUOJ already has exactly this split: raw rows in `submissions`, aggregate in `contest_participations` (DB) + a Redis ZSET (`contest:lb:{id}`) maintained by `ContestLeaderboardService.recordAcceptedSubmission()` after each AC. The aggregate leaks much less than raw rows (no source, no per-attempt timing), which is why standings can stay public during a contest while raw submissions are hidden.

### 0.3 Scoreboard freeze, technically

ICPC freeze: at `endTime − freezeDuration`, the public board stops reflecting new results. Two standard implementations:

1. **Snapshot** (what we build): persist the last aggregate computed before `freezeStart`; serve that snapshot to the public until unfreeze. Live aggregate keeps updating in the background for judges/admins and for instant unfreeze.
2. **Filter-on-read**: compute the public board only from submissions with `submitted_at < freezeStart`. Exact but expensive (full recompute) or requires a second incremental aggregate ("dual-ZSET").

```
 t ────────────────────────────────────────────────────────────────▶
   start                  freezeStart            end      ratingProcessed=true
   │ live board for all   │ public ⇐ snapshot   │ still snapshot │ live board for all
   │                      │ admin  ⇐ live       │ (rated only)   │ (unfrozen)
```

We choose snapshot because TDTUOJ's leaderboard read path already serializes the full `LeaderboardDTO` to Redis (30 s cache) — the frozen snapshot is the same JSON under a non-expiring key, overwritten on every rebuild *until* `freezeStart`, then left untouched.

### 0.4 Post-contest unlocking: flag flip, not data migration

Two ways to "reveal" hidden data after a contest:

- **Data migration** (eager): batch `UPDATE submissions SET visible = true WHERE contest_id = ?` when the contest finalizes. Fast reads, but requires a finalize hook, a backfill for old rows, a scheduler for unrated contests, and can desync (crash mid-flip).
- **Flag flip / computed** (lazy — our choice): visibility is a *function* of contest state evaluated at read time. The only mutation is the flag the system already flips: `contest.ratingProcessed = true` (step 8 of `ContestRatingService.processRatings()`). The instant it commits, every predicate in the system evaluates "unlocked". Zero migration, zero extra state.

Unlock predicate used everywhere in this plan (one definition, `ContestLockUtil.isLocked`):

```
locked(contest, now) :=
       contest is running or upcoming  (endTime >= now)
    OR (contest.isRated AND NOT contest.ratingProcessed)   # ended, ranking not final yet
```

### 0.5 Profile pages during a live round

Profile pages are the classic leak: verdict feed reveals *which problems a contestant solved and when* — enough to relay to a friend mid-contest. Codeforces' fix: the profile submission list excludes rows whose contest is running/system-testing; the submission detail page 404s for non-owners. We replicate both:

- list path → JPQL `NOT EXISTS (locked contest)` filter in `SubmissionRepository` (pagination metadata stays correct because filtering happens in SQL, not in Java);
- detail path → guard in `SubmissionServiceImpl.getSubmissionStatus()` returning **404** (not 403 — don't confirm the submission exists).

Secondary channels (solved-count ticking up on `userStatistics`, daily-activity heatmap) leak *that* a user solved *something*, not *what* — same as Codeforces; accepted, out of scope.

### 0.6 Plagiarism detection (future work, not in this plan)

Post-contest, platforms run pairwise similarity over all accepted contest submissions:

- **MOSS** (Measure of Software Similarity, Stanford): winnowing algorithm — normalize source (strip identifiers/whitespace), k-gram fingerprinting, select fingerprints per window, compare fingerprint sets across pairs. Robust to renaming and reordering.
- **Codeforces** runs an in-house checker after each round and skips both submissions + bans on positive matches.

Sketch for a future TDTUOJ module (`plagiarism/`):

```
after ratingProcessed:
  for each contest problem:
    acs = SELECT source_code FROM submissions WHERE contest_id=? AND problem_id=? AND verdict='AC'
    fingerprints[s] = winnow(normalize(s.source), k=5, window=4)
    for each pair (a, b): similarity = |fp[a] ∩ fp[b]| / |fp[a] ∪ fp[b]|
    flag pairs above threshold (e.g. 0.85) for manual review (admin monitor page)
```

Deliberately excluded from this plan (separate spec when wanted).

---

## Part 0.5 — Approved design decisions

| Decision | Choice |
|---|---|
| Hide rule | Contest submissions hidden from **everyone except owner, ADMIN, contest creator** while contest locked (closes the incognito loophole — profile endpoint is unauthenticated) |
| Unlock trigger | **Hybrid**: unrated → `endTime` passed; rated → `ratingProcessed == true` |
| Scope | Profile feed + submission detail endpoint + **ICPC-style snapshot scoreboard freeze** |
| Freeze model | Per-contest `freezeDurationMinutes` (nullable/0 = no freeze); public sees snapshot frozen at `endTime − freeze`; admin/creator see live; unfreeze = same hybrid unlock rule |
| Enforcement style | Computed visibility (read-time predicate), no new state on `Submission`, no migration |

**Known, accepted limitations** (document, don't fix here):
1. Frozen snapshot is the last board built before `freezeStart` — up to 30 s stale (cache TTL) relative to the exact freeze instant.
2. If Redis restarts mid-freeze (snapshot key lost) or nobody loaded the board before `freezeStart`, the fallback takes a one-time live snapshot at first frozen read — a small, logged leak window.
3. `userStatistics` solved-count / activity heatmap still tick during contests (reveals *that*, not *what* — same as Codeforces).
4. Partial-update API can't set `freezeDurationMinutes` back to SQL `NULL`; sending `0` disables freeze, which is equivalent.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `TDTUOJ_backend/.../common/utils/ContestLockUtil.java` | **Create** | Single definition of `isLocked` / `isFrozen` / `freezeStart` predicates |
| `TDTUOJ_backend/src/test/.../common/utils/ContestLockUtilTest.java` | **Create** | Unit tests for the predicates |
| `TDTUOJ_backend/.../contest/entity/Contest.java` | Modify | Add `freezeDurationMinutes` column |
| `TDTUOJ_backend/.../contest/dto/ContestDTO.java` | Modify | Expose `freezeDurationMinutes` |
| `TDTUOJ_backend/.../contest/service/ContestServiceImpl.java` | Modify | Map freeze field on create/update; privileged-viewer resolution; freeze-gate `getMyRank` |
| `TDTUOJ_backend/.../submission/repository/SubmissionRepository.java` | Modify | `findVisibleByUserId` JPQL |
| `TDTUOJ_backend/.../user/controller/UserController.java` | Modify | Profile feed uses visible-only query |
| `TDTUOJ_backend/.../submission/service/SubmissionServiceImpl.java` | Modify | Lock guard on `getSubmissionStatus` |
| `TDTUOJ_backend/src/test/.../submission/service/SubmissionServiceImplTest.java` | Modify | Guard tests |
| `TDTUOJ_backend/.../contest/dto/LeaderboardDTO.java` | Modify | `frozen` + `frozenAt` fields |
| `TDTUOJ_backend/.../contest/service/ContestLeaderboardService.java` | Modify | Frozen-snapshot serve/store logic |
| `TDTUOJ_backend/src/test/.../contest/service/ContestLeaderboardServiceTest.java` | Modify | Fix call sites for new signature |
| `tdtuoj_frontend/src/components/admin/AdminContestFormPage.jsx` | Modify | Freeze-duration input |
| `tdtuoj_frontend/src/components/contests/ContestDetailPage.jsx` | Modify | "FROZEN" badge on leaderboard |

---

## Part 1 — Backend: lock predicate foundation

### Task 1: Add `freezeDurationMinutes` to Contest entity + DTO + service mapping

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/entity/Contest.java` (after `ratingProcessed`, ~line 49)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/dto/ContestDTO.java` (after `isRated`, ~line 36)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java` (create ~line 106-120, update ~line 159-176)

- [ ] **Step 1: Add field to `Contest.java`** — insert after the `ratingProcessed` field (line 49):

```java
    /**
     * Scoreboard freeze window: public standings stop updating this many
     * minutes before endTime. Null or 0 = no freeze.
     */
    private Integer freezeDurationMinutes;
```

- [ ] **Step 2: Add field to `ContestDTO.java`** — insert after `private Boolean isRated;` (line 36):

```java
    private Integer freezeDurationMinutes;
```

- [ ] **Step 3: Map on create** — in `ContestServiceImpl.createContest`'s `Contest.builder()` chain (~line 106), add after `.isRated(...)`:

```java
                .freezeDurationMinutes(dto.getFreezeDurationMinutes())
```

- [ ] **Step 4: Map on update** — in `ContestServiceImpl.updateContest`'s partial-update block (~line 159-176), add after the `isRated` branch:

```java
        if (dto.getFreezeDurationMinutes() != null) contest.setFreezeDurationMinutes(dto.getFreezeDurationMinutes());
```

- [ ] **Step 5: Compile**

Run: `cd TDTUOJ_backend && ./mvnw compile -q`
Expected: BUILD SUCCESS, no errors. (`ddl-auto: update` will add the nullable column on next boot — no manual migration.)

- [ ] **Step 6: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest
git commit -m "feat(contest): add freezeDurationMinutes field for scoreboard freeze"
```

---

### Task 2: `ContestLockUtil` — the single lock/freeze predicate (TDD)

**Files:**
- Create: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/common/utils/ContestLockUtil.java`
- Test: `TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/common/utils/ContestLockUtilTest.java`

- [ ] **Step 1: Write the failing test** — create `ContestLockUtilTest.java`:

```java
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=ContestLockUtilTest`
Expected: compilation FAILURE — `ContestLockUtil` does not exist.

- [ ] **Step 3: Implement** — create `ContestLockUtil.java`:

```java
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=ContestLockUtilTest`
Expected: all 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/common/utils/ContestLockUtil.java TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/common/utils/ContestLockUtilTest.java
git commit -m "feat(contest): add ContestLockUtil lock/freeze predicates"
```

---

## Part 2 — Backend: profile + detail endpoint privacy

### Task 3: Visible-only profile submissions query

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java`
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/user/controller/UserController.java:105-117`

- [ ] **Step 1: Add JPQL query** — in `SubmissionRepository.java`, after `findByUserId` (line 19), add:

```java
    /**
     * Public-profile feed: a user's submissions EXCLUDING those that belong to
     * a locked contest (running/upcoming, or ended-rated with rating not yet
     * processed). Mirrors ContestLockUtil.isLocked — keep in sync.
     * NOT EXISTS (rather than IN) so submissions whose contest was deleted
     * stay visible.
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT s FROM Submission s WHERE s.userId = :userId " +
        "AND (s.contestId IS NULL OR NOT EXISTS (" +
        "  SELECT c FROM com.oj.TDTUOJ.contest.entity.Contest c WHERE c.id = s.contestId " +
        "  AND (c.endTime >= :now OR (c.isRated = true AND c.ratingProcessed = false))))"
    )
    Page<Submission> findVisibleByUserId(
        @org.springframework.data.repository.query.Param("userId") Long userId,
        @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
        Pageable pageable);
```

- [ ] **Step 2: Switch the profile endpoint to it** — in `UserController.getUserSubmissions` (line 113), replace:

```java
        Page<SubmissionDTO> result = submissionRepository.findByUserId(userId, pageable)
                .map(s -> modelMapper.map(s, SubmissionDTO.class));
```

with:

```java
        Page<SubmissionDTO> result = submissionRepository
                .findVisibleByUserId(userId, java.time.LocalDateTime.now(), pageable)
                .map(s -> modelMapper.map(s, SubmissionDTO.class));
```

- [ ] **Step 3: Compile**

Run: `cd TDTUOJ_backend && ./mvnw compile -q`
Expected: BUILD SUCCESS. (JPQL is parsed at startup; a syntax error would surface at boot — final verification task boots the app.)

- [ ] **Step 4: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/user/controller/UserController.java
git commit -m "feat(privacy): hide locked-contest submissions from public profile feed"
```

---

### Task 4: Guard the submission-detail endpoint (TDD)

`GET /api/submissions/{id}/status` currently returns any submission (source code included) to anyone. Add an owner/admin/creator guard for locked-contest submissions; return **404** to avoid confirming existence.

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/service/SubmissionServiceImpl.java:142-160`
- Test: `TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/submission/service/SubmissionServiceImplTest.java`

- [ ] **Step 1: Write the failing tests** — add to `SubmissionServiceImplTest.java` (mocks for `submissionRepository`, `contestRepository`, `userService`, `modelMapper` already declared at lines 43-52; `user(Long, String)` helper at line 54). Add these imports if missing: `java.time.LocalDateTime`:

```java
    // ── getSubmissionStatus: locked-contest guard ─────────────────────────

    private Submission contestSubmission(Long ownerId, Long contestId) {
        Submission s = new Submission();
        s.setId(500L);
        s.setUserId(ownerId);
        s.setContestId(contestId);
        s.setSubmissionStatus(SubmissionStatus.COMPLETED);
        return s;
    }

    private Contest lockedContest(Long id) {
        return Contest.builder()
                .id(id)
                .endTime(LocalDateTime.now().plusHours(1)) // running → locked
                .isRated(true)
                .ratingProcessed(false)
                .build();
    }

    @Test
    void getSubmissionStatus_lockedContest_anonymousViewer_throwsNotFound() {
        when(submissionRepository.findById(500L))
                .thenReturn(Optional.of(contestSubmission(1L, 9L)));
        when(contestRepository.findById(9L)).thenReturn(Optional.of(lockedContest(9L)));
        when(userService.getCurrentLoggedInUser()).thenThrow(new NotFoundException("User not found"));

        assertThrows(NotFoundException.class, () -> submissionService.getSubmissionStatus(500L));
    }

    @Test
    void getSubmissionStatus_lockedContest_otherParticipant_throwsNotFound() {
        when(submissionRepository.findById(500L))
                .thenReturn(Optional.of(contestSubmission(1L, 9L)));
        when(contestRepository.findById(9L)).thenReturn(Optional.of(lockedContest(9L)));
        when(userService.getCurrentLoggedInUser()).thenReturn(user(2L, "PARTICIPANT"));

        assertThrows(NotFoundException.class, () -> submissionService.getSubmissionStatus(500L));
    }

    @Test
    void getSubmissionStatus_lockedContest_owner_succeeds() {
        Submission s = contestSubmission(1L, 9L);
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(s));
        when(contestRepository.findById(9L)).thenReturn(Optional.of(lockedContest(9L)));
        when(userService.getCurrentLoggedInUser()).thenReturn(user(1L, "PARTICIPANT"));
        when(modelMapper.map(any(Submission.class), eq(SubmissionDTO.class))).thenReturn(new SubmissionDTO());

        Response<SubmissionDTO> resp = submissionService.getSubmissionStatus(500L);
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }

    @Test
    void getSubmissionStatus_lockedContest_admin_succeeds() {
        Submission s = contestSubmission(1L, 9L);
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(s));
        when(contestRepository.findById(9L)).thenReturn(Optional.of(lockedContest(9L)));
        when(userService.getCurrentLoggedInUser()).thenReturn(user(99L, "ADMIN"));
        when(modelMapper.map(any(Submission.class), eq(SubmissionDTO.class))).thenReturn(new SubmissionDTO());

        Response<SubmissionDTO> resp = submissionService.getSubmissionStatus(500L);
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }

    @Test
    void getSubmissionStatus_unlockedContest_otherViewer_succeeds() {
        Submission s = contestSubmission(1L, 9L);
        Contest finished = Contest.builder()
                .id(9L)
                .endTime(LocalDateTime.now().minusHours(2))
                .isRated(true)
                .ratingProcessed(true) // finalized → unlocked
                .build();
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(s));
        when(contestRepository.findById(9L)).thenReturn(Optional.of(finished));
        when(modelMapper.map(any(Submission.class), eq(SubmissionDTO.class))).thenReturn(new SubmissionDTO());

        Response<SubmissionDTO> resp = submissionService.getSubmissionStatus(500L);
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }
```

Note for the last test: no `userService` stub on purpose — an unlocked contest must not even resolve the viewer (use `lenient()` or no stub; Mockito strict stubbing passes because the code path never calls it).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=SubmissionServiceImplTest`
Expected: the 2 `throwsNotFound` tests FAIL (guard not implemented — status currently returned to everyone). `owner`/`admin`/`unlocked` tests may pass already (no guard = everything visible); that's fine.

- [ ] **Step 3: Implement the guard** — in `SubmissionServiceImpl.getSubmissionStatus` (line 142), insert after the `findById(...).orElseThrow(...)` (line 144) and before the DTO mapping:

```java
        // Contest fairness: hide locked-contest submissions from non-owners.
        // 404 (not 403) — don't confirm the submission exists.
        if (submission.getContestId() != null) {
            Contest contest = contestRepository.findById(submission.getContestId()).orElse(null);
            if (contest != null
                    && ContestLockUtil.isLocked(contest, LocalDateTime.now())
                    && !canViewLockedSubmission(submission, contest)) {
                throw new NotFoundException("Submission not found");
            }
        }
```

And add this private helper to the class:

```java
    /** Owner, ADMIN, or contest creator may view a locked-contest submission. */
    private boolean canViewLockedSubmission(Submission submission, Contest contest) {
        User viewer;
        try {
            viewer = userService.getCurrentLoggedInUser();
        } catch (Exception e) {
            return false; // anonymous
        }
        if (viewer.getId().equals(submission.getUserId())) return true;
        boolean isAdmin = viewer.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        boolean isCreator = contest.getCreator() != null
                && contest.getCreator().getId().equals(viewer.getId());
        return isAdmin || isCreator;
    }
```

Add imports if missing: `com.oj.TDTUOJ.common.utils.ContestLockUtil`, `java.time.LocalDateTime` (`Contest`, `User`, `NotFoundException` are already imported in this class).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=SubmissionServiceImplTest`
Expected: ALL tests PASS, including the pre-existing ones (polling own pending submission still works — owner path).

- [ ] **Step 5: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/service/SubmissionServiceImpl.java TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/submission/service/SubmissionServiceImplTest.java
git commit -m "feat(privacy): 404 locked-contest submissions for non-owners on detail endpoint"
```

---

## Part 3 — Backend: scoreboard freeze

### Task 5: `LeaderboardDTO` freeze fields

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/dto/LeaderboardDTO.java`

- [ ] **Step 1: Add two fields** to `LeaderboardDTO` (it's a Lombok `@Data`/`@Builder` DTO — add alongside `lastUpdated`):

```java
    /** True when the viewer is being served the frozen snapshot. */
    private Boolean frozen;

    /** Moment the freeze window began (endTime - freezeDurationMinutes). */
    private LocalDateTime frozenAt;
```

- [ ] **Step 2: Compile**

Run: `cd TDTUOJ_backend && ./mvnw compile -q`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/dto/LeaderboardDTO.java
git commit -m "feat(contest): add frozen/frozenAt fields to LeaderboardDTO"
```

---

### Task 6: Frozen-snapshot logic in `ContestLeaderboardService`

Mechanism: while `now < freezeStart`, every fresh board build also overwrites a **non-expiring** Redis key `contest:lb:frozen:{id}` with the *full* (unpaged) board. Once the freeze window begins, that key stops being overwritten — it *is* the frozen snapshot. Non-privileged viewers get it; privileged viewers bypass it. After unlock, the key is lazily deleted.

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestLeaderboardService.java`
- Modify: `TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestLeaderboardServiceTest.java` (call-site signature fixes)

- [ ] **Step 1: Add the frozen key constant** — next to the other key prefixes (line 54-57):

```java
    private static final String FROZEN_KEY = "contest:lb:frozen:";  // STRING, no TTL — frozen snapshot JSON
```

- [ ] **Step 2: Replace `getLeaderboard(Long, int, int)`** (lines 172-203) with a privileged-aware version:

```java
    /**
     * Returns the leaderboard for a contest.
     *
     * <p>Freeze semantics: while the contest's freeze window is active
     * ({@link ContestLockUtil#isFrozen}), non-privileged viewers receive the
     * frozen snapshot (last board built before the window began). Privileged
     * viewers (ADMIN / contest creator) always get the live board.
     *
     * @param contestId  contest to fetch
     * @param page       0-based page index
     * @param size       entries per page (0 = unlimited)
     * @param privileged true for ADMIN / contest-creator viewers
     */
    public LeaderboardDTO getLeaderboard(Long contestId, int page, int size, boolean privileged) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new com.oj.TDTUOJ.common.exceptions.NotFoundException(
                        "Contest not found: " + contestId));
        LocalDateTime now = LocalDateTime.now();

        // ── Freeze window: public viewers get the snapshot ────────────────
        if (!privileged && ContestLockUtil.isFrozen(contest, now)) {
            return getFrozenSnapshot(contest, page, size);
        }

        // ── Live path (pre-freeze, unlocked, or privileged viewer) ───────
        // 1. Try the short-lived cached snapshot first
        String cacheKey = CACHE_KEY + contestId;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached.toString(), LeaderboardDTO.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialise cached leaderboard for contestId={}", contestId, e);
            }
        }

        // 2. Build from ZSET
        LeaderboardDTO leaderboard = buildLeaderboard(contest, page, size);

        // 3. Cache the result for 30 s
        try {
            String json = objectMapper.writeValueAsString(leaderboard);
            redisTemplate.opsForValue().set(cacheKey, json, CACHE_TTL_SECONDS, TimeUnit.SECONDS);

            // Also persist to DB for durability (async, properly proxied)
            cacheHelper.persistSnapshot(contestId, json, leaderboard.getTotalParticipants());
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialise leaderboard for caching contestId={}", contestId, e);
        }

        // 4. Maintain the frozen snapshot until the freeze window begins
        LocalDateTime freezeStart = ContestLockUtil.freezeStart(contest);
        if (freezeStart != null) {
            if (now.isBefore(freezeStart)) {
                storeFrozenSnapshot(contestId, buildLeaderboard(contest, 0, 0));
            } else if (!ContestLockUtil.isLocked(contest, now)) {
                // Contest unlocked — frozen snapshot no longer needed
                redisTemplate.delete(FROZEN_KEY + contestId);
            }
        }

        return leaderboard;
    }
```

(The body of steps 1-3 is the existing code unchanged except the contest lookup moved to the top; only the freeze branch and step 4 are new.)

- [ ] **Step 3: Add the snapshot helpers** — in the "Internal helpers" section:

```java
    /** Serve the frozen snapshot; falls back to a one-time live snapshot if missing. */
    private LeaderboardDTO getFrozenSnapshot(Contest contest, int page, int size) {
        String key = FROZEN_KEY + contest.getId();
        LeaderboardDTO full = null;

        Object json = redisTemplate.opsForValue().get(key);
        if (json != null) {
            try {
                full = objectMapper.readValue(json.toString(), LeaderboardDTO.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialise frozen snapshot for contestId={}", contest.getId(), e);
            }
        }

        if (full == null) {
            // No pre-freeze snapshot (Redis restart, or board never viewed
            // before the freeze). One-time live snapshot — small leak window.
            log.warn("No frozen snapshot for contestId={}; snapshotting live board now", contest.getId());
            full = buildLeaderboard(contest, 0, 0);
            storeFrozenSnapshot(contest.getId(), full);
        }

        full.setFrozen(true);
        full.setFrozenAt(ContestLockUtil.freezeStart(contest));
        return slicePage(full, page, size);
    }

    private void storeFrozenSnapshot(Long contestId, LeaderboardDTO full) {
        try {
            redisTemplate.opsForValue().set(FROZEN_KEY + contestId, objectMapper.writeValueAsString(full));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialise frozen snapshot for contestId={}", contestId, e);
        }
    }

    /** In-memory pagination over the full frozen board. */
    private static LeaderboardDTO slicePage(LeaderboardDTO full, int page, int size) {
        if (size <= 0 || full.getEntries() == null) return full;
        int from = page * size;
        List<ScoreboardEntryDTO> entries = full.getEntries();
        List<ScoreboardEntryDTO> slice = from >= entries.size()
                ? Collections.emptyList()
                : entries.subList(from, Math.min(from + size, entries.size()));
        full.setEntries(new ArrayList<>(slice));
        return full;
    }
```

Add import: `com.oj.TDTUOJ.common.utils.ContestLockUtil` (the `java.util.*` and `LocalDateTime` imports already exist).

- [ ] **Step 4: Fix existing call sites and tests**
  - `ContestServiceImpl.getLeaderboard` (line 315) — temporary fix so the build passes; properly rewritten in Task 7: `leaderboardService.getLeaderboard(contestId, page, size, false)`
  - `ContestLeaderboardServiceTest.java` — update every `getLeaderboard(id, page, size)` call to `getLeaderboard(id, page, size, false)`. Tests that stub the cache hit also need a `contestRepository.findById` stub now (contest lookup moved before cache read): `when(contestRepository.findById(anyLong())).thenReturn(Optional.of(Contest.builder().id(1L).endTime(LocalDateTime.now().plusHours(1)).build()))` — adapt to each test's existing fixture.

- [ ] **Step 5: Run tests**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=ContestLeaderboardServiceTest`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestLeaderboardService.java TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestLeaderboardServiceTest.java
git commit -m "feat(contest): ICPC-style frozen scoreboard snapshot in leaderboard service"
```

---

### Task 7: Privileged-viewer resolution + freeze-gate `getMyRank`

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java:309-330`

- [ ] **Step 1: Rewrite `getLeaderboard`** (lines 309-317) to resolve the viewer:

```java
    @Override
    public Response<LeaderboardDTO> getLeaderboard(Long contestId, int page, int size) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        LeaderboardDTO leaderboard = leaderboardService
                .getLeaderboard(contestId, page, size, isPrivilegedViewer(contest));
        return ok(leaderboard);
    }
```

- [ ] **Step 2: Add the helper** to `ContestServiceImpl`:

```java
    /**
     * ADMIN or contest creator — sees the live board during a scoreboard freeze.
     * The leaderboard endpoint is public, so anonymous viewers resolve to false.
     */
    private boolean isPrivilegedViewer(Contest contest) {
        try {
            User viewer = userService.getCurrentLoggedInUser();
            boolean isAdmin = viewer.getRoles().stream()
                    .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
            boolean isCreator = contest.getCreator() != null
                    && contest.getCreator().getId().equals(viewer.getId());
            return isAdmin || isCreator;
        } catch (Exception e) {
            return false; // anonymous
        }
    }
```

- [ ] **Step 3: Freeze-gate `getMyRank`** (lines 319-330). The neighbours widget reads the **live** ZSET, which would leak others' frozen-window progress. During a freeze, clamp `window` to 0 for non-privileged callers — they still see their own (live) row, but no neighbours:

```java
    @Override
    public Response<List<ScoreboardEntryDTO>> getMyRank(Long contestId, int window) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));

        // During a scoreboard freeze, non-privileged users see only their own row
        if (ContestLockUtil.isFrozen(contest, java.time.LocalDateTime.now())
                && !isPrivilegedViewer(contest)) {
            window = 0;
        }
        // ... keep the rest of the existing method body unchanged
        //     (current-user resolution + leaderboardService.getNeighbours call)
    }
```

Keep the existing body after the lock check — only the contest lookup (replacing the bare `existsById` check) and the window clamp are new. Add import `com.oj.TDTUOJ.common.utils.ContestLockUtil`.

- [ ] **Step 4: Run contest service tests**

Run: `cd TDTUOJ_backend && ./mvnw test -q -Dtest=ContestServiceImplTest`
Expected: PASS. If a `getLeaderboard`/`getMyRank` test stubs `existsById`, switch the stub to `findById(...) → Optional.of(contest fixture)`.

- [ ] **Step 5: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestServiceImplTest.java
git commit -m "feat(contest): privileged viewer bypass + freeze-gated rank widget"
```

---

## Part 4 — Frontend

### Task 8: Freeze-duration input on admin contest form

**Files:**
- Modify: `tdtuoj_frontend/src/components/admin/AdminContestFormPage.jsx` (lines 171, 287, 307-310, ~475)

- [ ] **Step 1: Extend `EMPTY_FORM`** (line 171) — add `freezeDuration: ""`:

```js
const EMPTY_FORM = { name: "", description: "", startTime: "", endTime: "", registrationStart: "", maxParticipant: "20", isPublic: true, isRated: true, contestStyle: "ICPC", freezeDuration: "", problems: [] };
```

- [ ] **Step 2: Prefill on edit** (line 287) — inside the `setForm({...})` call add:

```js
freezeDuration: c.freezeDurationMinutes ? String(c.freezeDurationMinutes) : "",
```

- [ ] **Step 3: Send in the payload** (lines 307-310) — add to the submitted object (empty → `0`, which the backend treats as "no freeze"; `0` rather than `null` so editing can *disable* a previously-set freeze):

```js
freezeDurationMinutes: form.freezeDuration === "" ? 0 : Math.max(0, parseInt(form.freezeDuration, 10) || 0),
```

- [ ] **Step 4: Add the input** — directly below the "Rated contest" toggle (line ~475), matching the form's existing field idiom (same label/input classes used by the `maxParticipant` field in this file):

```jsx
<div style={{ marginTop: 12 }}>
  <label className="form-label">Scoreboard freeze (minutes before end)</label>
  <input
    type="number"
    min="0"
    className="form-control"
    value={form.freezeDuration}
    onChange={(e) => set("freezeDuration", e.target.value)}
    placeholder="0 = no freeze"
  />
  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
    Public standings stop updating for the final N minutes (ICPC style). Admins still see the live board.
  </span>
</div>
```

(If the surrounding fields use a different wrapper/class structure, mirror that structure — the behavior above is what matters.)

- [ ] **Step 5: Build**

Run: `cd tdtuoj_frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add tdtuoj_frontend/src/components/admin/AdminContestFormPage.jsx
git commit -m "feat(admin): scoreboard freeze duration input on contest form"
```

---

### Task 9: "FROZEN" badge on the public leaderboard

**Files:**
- Modify: `tdtuoj_frontend/src/components/contests/ContestDetailPage.jsx:168-182` (`LeaderboardTable` header row)

- [ ] **Step 1: Add the badge** — in `LeaderboardTable`, inside the header flex row (lines 171-182), after the participants `<span>` (line 175), insert:

```jsx
{data?.frozen && (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 10px", borderRadius: 6,
    background: "rgba(34, 211, 238, 0.12)", color: "var(--cyan)",
    fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.05em",
  }}>
    ❄ FROZEN
    {data.frozenAt && (
      <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>
        — standings as of {new Date(data.frozenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    )}
  </span>
)}
```

- [ ] **Step 2: Build**

Run: `cd tdtuoj_frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add tdtuoj_frontend/src/components/contests/ContestDetailPage.jsx
git commit -m "feat(contest): show frozen badge on leaderboard during freeze window"
```

No `ProfilePage.jsx` change needed: the backend now omits locked submissions from the feed, and the page already renders whatever the API returns.

---

## Part 5 — Verification

### Task 10: Full build + test + manual end-to-end check

- [ ] **Step 1: Backend full test suite**

Run: `cd TDTUOJ_backend && ./mvnw test -q`
Expected: BUILD SUCCESS, zero failures.

- [ ] **Step 2: Frontend production build**

Run: `cd tdtuoj_frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Boot smoke test** (requires PostgreSQL :5431, Redis :6379)

Run: `cd TDTUOJ_backend && ./mvnw spring-boot:run` — wait for "Started TdtuojApplication". This validates the new JPQL parses and `ddl-auto: update` adds `freeze_duration_minutes` to `contests`.

- [ ] **Step 4: Manual end-to-end scenario** — see the detailed walkthrough below (Part 6). Follow it top to bottom; every checkbox has an expected result.

- [ ] **Step 5: Report results** — including test output — honestly.

---

## Part 6 — Manual verification walkthrough (~15 min)

One timed sitting. The rating scheduler (`ContestRatingScheduler`, every 60 s) finalizes rated contests automatically ~1 min after `endTime` — no manual trigger needed.

### 6.0 Setup (before starting the clock)

- [ ] Services up: PostgreSQL :5431, Redis :6379, Judge0 :2358
- [ ] Backend: `cd TDTUOJ_backend && ./mvnw spring-boot:run` — wait for `Started TdtuojApplication`. First boot after this feature adds the new column via `ddl-auto: update`. Verify:

```sql
SELECT id, name, freeze_duration_minutes, rating_processed
FROM contests ORDER BY id DESC LIMIT 5;
-- column exists, old rows show NULL freeze_duration_minutes
```

- [ ] Frontend: `cd tdtuoj_frontend && npm run dev` → http://localhost:5173
- [ ] Three accounts ready: **admin** (ADMIN role), **alice**, **bob** (PARTICIPANT). Register via UI if missing.
- [ ] Grab API tokens when needed: log the user in via browser → DevTools → Application → Local Storage → copy `token` value. Store in PowerShell:

```powershell
$aliceToken = "<paste>"
$bobToken   = "<paste>"
```

- [ ] Have a known-AC solution ready for one easy problem (e.g. A+B in Python).

### 6.1 Create the test contest (admin) — START THE CLOCK ("T+0")

- [ ] Admin → Contests → Create Contest:

| Field | Value | Why |
|---|---|---|
| Name | `Privacy Test` | — |
| Start Time | **T−5 min** (5 minutes in the past) | contest already RUNNING |
| End Time | **T+12 min** | short round |
| Rated contest | **ON** | tests the `ratingProcessed` unlock path |
| Scoreboard Freeze | **6** | freeze window = T+6 → unlock |
| Problems | 1 easy problem | the one you have an AC for |

- [ ] **Expected:** contest saves, appears as RUNNING.
- [ ] Re-open the contest in the admin edit form. **Expected:** Scoreboard Freeze field shows `6` (prefill works).
- [ ] DB check: `SELECT freeze_duration_minutes FROM contests WHERE name = 'Privacy Test';` → `6`.
- [ ] **alice** and **bob** both register for the contest (contest detail page → Register).

### 6.2 Profile privacy during the contest (T+1 … T+5)

- [ ] **alice**: open the contest problem → submit the AC solution. **Expected:** verdict appears normally (own-submission polling = owner path through the new guard).
- [ ] Note alice's submission **id** (visible in her own profile → Submissions tab, or network tab response).
- [ ] **alice** → own profile `/users/alice` → Submissions tab. **Expected:** contest submission **visible**, "View source code" modal opens. (Owner sees own.)
- [ ] **bob** (logged in) → `/users/alice` → Submissions tab. **Expected:** the contest submission is **absent**. Alice's older practice submissions still listed.
- [ ] **Incognito window** (logged out) → `/users/alice`. **Expected:** contest submission **absent**. *This is the loophole test — viewer-identity-based hiding would fail here.*
- [ ] API checks (replace `<id>`):

```powershell
# anonymous → 404 envelope
Invoke-RestMethod http://localhost:8090/api/submissions/<id>/status
# bob → 404 envelope ("Submission not found" — existence not confirmed)
Invoke-RestMethod http://localhost:8090/api/submissions/<id>/status -Headers @{Authorization="Bearer $bobToken"}
# alice → 200, payload includes sourceCode
Invoke-RestMethod http://localhost:8090/api/submissions/<id>/status -Headers @{Authorization="Bearer $aliceToken"}
```

- [ ] **admin** → Contest Monitor for `Privacy Test`. **Expected:** alice's submission and source code fully visible (admin bypass).

### 6.3 Pre-freeze leaderboard (still before T+6)

- [ ] Open the contest leaderboard **logged out**. **Expected:** alice ranked with 1 solve, **no FROZEN badge**, auto-refresh note shown.
- [ ] This view also writes the frozen snapshot. Verify in Redis:

```powershell
redis-cli GET contest:lb:frozen:<contestId>   # → JSON leaderboard blob
```

> ⚠ If you skip this step and nobody views the board before T+6, the fallback path takes a one-time live snapshot at first frozen read (logged: `No frozen snapshot for contestId=...`). Feature still works; snapshot just dates from the first frozen view.

### 6.4 Freeze window (T+6 … T+12)

- [ ] Wait until T+6 has passed (freeze active).
- [ ] **bob**: submit the AC solution to the same problem. **Expected:** bob's own verdict shows normally on the problem page.
- [ ] Public/incognito leaderboard (allow up to 30 s for the cache):
  - **Expected:** badge **`❄ FROZEN — standings as of <time>`** visible.
  - **Expected:** bob's AC **not** on the board; alice's row unchanged (pre-freeze state).
- [ ] **bob** (logged in, non-privileged) sees the same frozen board.
- [ ] **admin** opens the same leaderboard. **Expected:** bob's AC **visible**, **no badge** (live board, privileged bypass).
- [ ] (Optional) rank-widget API during freeze — non-privileged gets own row only:

```powershell
Invoke-RestMethod "http://localhost:8090/api/contests/<contestId>/leaderboard/me?window=3" -Headers @{Authorization="Bearer $bobToken"}
# expect: exactly 1 entry (bob himself), no neighbours
```

### 6.5 Unlock (after T+12)

- [ ] Contest ends at T+12. Within ~60 s the backend log prints:

```
Processing ratings for contest 'Privacy Test' (id=...)
```

- [ ] DB check: `SELECT rating_processed FROM contests WHERE name = 'Privacy Test';` → `true`.
- [ ] Everything flips (allow 30 s cache lag):
  - [ ] Leaderboard (anonymous): badge **gone**, bob's AC **on the board**. Frozen Redis key deleted on the next public read: `redis-cli GET contest:lb:frozen:<contestId>` → `(nil)`.
  - [ ] `/users/alice` as bob/incognito: contest submission **now visible**, source modal works.
  - [ ] Detail endpoint as bob: **200** with `sourceCode`.
  - [ ] Profiles show the rating change (pre-existing behavior — confirms finalization really ran).

### 6.6 Variant checks (optional, +10 min)

- [ ] **Unrated contest:** repeat with Rated **OFF**, freeze 3, duration 6 min. **Expected:** everything unlocks **immediately at endTime** — no scheduler wait (hybrid unlock rule, unrated branch).
- [ ] **No freeze:** contest with freeze blank/0. **Expected:** leaderboard live the whole time, no badge, no `contest:lb:frozen:*` key ever created.
- [ ] **Freeze disable via edit:** edit a contest with freeze 6 → set field to 0 → save → re-open. **Expected:** field shows blank/0 and board never freezes (payload sends `0`, not `null`, so the partial update applies it).

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Leaderboard reaction lags | 30 s Redis cache (`contest:lb:cache:*`) | wait/refresh; not a bug |
| Frozen board shows post-freeze AC | board first viewed only *after* T+6 → fallback live snapshot | expected, documented limitation; view board pre-freeze next run |
| Rated contest never unlocks | submissions still PENDING/RUNNING block the scheduler | check backend log: `has unjudged submissions — skipping rating` |
| `freeze_duration_minutes` column missing | backend not restarted after pulling this feature | restart backend (`ddl-auto: update` adds it at boot) |

---

## Execution order & dependencies

```
Task 1 (entity field) ──▶ Task 2 (lock util) ──▶ Task 3 (profile feed)
                                   │                Task 4 (detail guard)
                                   └──▶ Task 5 (DTO) ──▶ Task 6 (freeze service) ──▶ Task 7 (privileged viewer)
Task 8, Task 9 (frontend) — after Task 7
Task 10 (verification) — last
```

Tasks 3 and 4 are independent of 5-7 (privacy vs. freeze) and may be done in either order after Task 2.
