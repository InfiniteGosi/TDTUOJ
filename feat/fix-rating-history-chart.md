# Fix Rating History Chart — UserDetailPage / ProfilePage

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans skill. Steps use `- [ ]` syntax.

**Goal:** Make the Rating History line chart on `/users/:username` reflect actual contest outcomes truthfully — eliminate spurious dips, ensure chronological ordering, and prevent duplicate `rating_history` rows.

---

## Context

User reports the Rating History chart on `ProfilePage.jsx` is wrong. Tooltip data they hovered:

- "19 Apr 26" — **Test diff**, Rating **1500**, **+0**, Rank #1
- "06 May 26" — **TDTU Game**, Rating **1475**, **-25**, Rank #2

Expected shape with these two contests + a synthetic start: flat at 1500 then a single drop to 1475 (`___\`).

Observed shape: flat at 1500 → drop to ~1465 → rise to 1475 (`___\/_`). X-axis renders **4 ticks** ("12 Apr 26", "19 Apr 26", "19 Apr 26", "06 May 26") — i.e. the chart is receiving 4 data points (1 synthetic + 3 contests), but the user only knows of 2 contests.

### Why this happens — three real defects feeding each other

1. **`@CreationTimestamp` collision on `rating_history.created_at`.** `ContestRatingService.processRatings()` (`TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingService.java:170-179`) inserts one row per participant inside a single `@Transactional` loop. Hibernate stamps `created_at` at insert time, so multiple rows in the same batch can share the same millisecond. The repo already added secondary `id DESC` (`RatingHistoryRepository.java:13`), which fixes intra-batch ordering, but `created_at` still has **nothing to do with when the contest actually ended** — only when the scheduler happened to process it. Two contests processed in the same scheduler tick get the same X-axis date.

2. **No DB-level uniqueness on `(user_id, contest_id)`.** `processRatings()` rolls back then re-inserts inside `@Transactional`, but the scheduler (`ContestRatingScheduler`) runs every 60s and there is no `@Async`/lock guard. Repository exposes `existsByContestIdAndUserId` but `processRatings()` does **not** call it — it relies solely on `findByContestId` + `deleteAll` then re-insert. A race or interrupted run can leave duplicate rows. The phantom 3rd data point in the user's chart is most plausibly a duplicate of either Test diff or TDTU Game with stale `old/newRating` from an earlier rating pass.

3. **Synthetic start point is confusing.** `ProfilePage.jsx:298-303` prepends a fake data point dated 7 days before the first contest, with `rating = points[0].oldRating`. This is what produces the extra "12 Apr 26" tick. If the underlying chronological ordering is wrong (defect 1), this synthetic anchor amplifies the visual lie.

---

## Investigation Step (run before/with the fix)

Confirm whether the bottom-dip data point is a duplicate row or a legitimate 3rd contest the user forgot about.

```sql
-- Replace <username> below.
SELECT rh.id, rh.contest_id, rh.contest_name,
       rh.old_rating, rh.new_rating, rh.rating_change, rh.rank,
       rh.created_at, c.end_time
FROM rating_history rh
JOIN users u ON u.id = rh.user_id
LEFT JOIN contest c ON c.id = rh.contest_id
WHERE u.username = '<username>'
ORDER BY c.end_time ASC, rh.id ASC;
```

- If 3+ rows appear and (`contest_id`, `user_id`) repeats → **duplicate** → fix #2 below cleans it up.
- If 3 rows appear with distinct `contest_id` → it's a real 3rd contest the user did not mention; only fix #1 and #3 below are required to make the chart honest.

---

## Fix Plan

### Backend

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/entity/RatingHistory.java`

- [ ] Add `private LocalDateTime contestEndTime;` field. This becomes the **chronological key** for ordering and display, independent of insert time.
- [ ] Add `@Table(name = "rating_history", uniqueConstraints = @UniqueConstraint(name = "uk_rating_history_user_contest", columnNames = {"user_id", "contest_id"}))`. Prevents future duplicate rows at DB layer. `ddl-auto: update` will add the constraint on next boot; if a duplicate already exists Hibernate will error — that's the signal to run the dedup SQL in the migration section.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingService.java`

- [ ] In the builder at lines 170-179, also set `.contestEndTime(contest.getEndTime())`.
- [ ] In the rollback block (lines 61-84), keep the `deleteAll` logic — once the unique constraint exists, `existsByContestIdAndUserId` becomes a redundant defence and we don't need to refactor.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/RatingHistoryRepository.java`

- [ ] Replace `findByUserIdOrderByCreatedAtDescIdDesc` with `findByUserIdOrderByContestEndTimeDescIdDesc`. Keep both during the transition if any other caller exists (none found in current scan, so straight rename is safe).

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/user/service/UserServiceImpl.java`

- [ ] In `getRatingHistory()` (line 302+), call the renamed repo method. Map `contestEndTime` into the DTO.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/dto/RatingHistoryDTO.java`

- [ ] Add `private LocalDateTime contestEndTime;` field.

### Backend — one-time data fix (only if investigation SQL finds duplicates)

```sql
-- Keep newest row per (user_id, contest_id), delete older copies.
DELETE FROM rating_history a
USING rating_history b
WHERE a.user_id = b.user_id
  AND a.contest_id = b.contest_id
  AND a.id < b.id;

-- Backfill contest_end_time for existing rows.
UPDATE rating_history rh
SET contest_end_time = c.end_time
FROM contest c
WHERE c.id = rh.contest_id
  AND rh.contest_end_time IS NULL;
```

### Frontend

**File:** `tdtuoj_frontend/src/components/profile/ProfilePage.jsx`

- [ ] In `RatingChart` (line 288), change `points` sort key to use `contestEndTime` falling back to `createdAt` (for safety until backfill runs).
- [ ] Remove the synthetic start point (lines 298-303 + spread at 302-311). Render only real contest data points. The first contest naturally shows its own `oldRating` via the tooltip's "before" value; the fake "12 Apr 26" anchor adds no information and was the source of the misleading flat tail.
- [ ] In the `chartData` map, use `p.contestEndTime ?? p.createdAt` for the `name` axis label.
- [ ] If the chart looks too sparse with only N real points, set `<XAxis interval={0}>` so each contest gets a tick, removing Recharts' auto-collapsing that produced the duplicate "19 Apr 26" labels.

**File:** `tdtuoj_frontend/src/services/ApiService.js`

- [ ] No change. `getRatingHistory()` is a pass-through; new `contestEndTime` flows naturally in the JSON.

---

## File Map (Summary)

**Backend (modify):**
- `contest/entity/RatingHistory.java` — add `contestEndTime`, unique constraint
- `contest/service/ContestRatingService.java` — populate `contestEndTime` on insert
- `contest/repository/RatingHistoryRepository.java` — rename query method
- `contest/dto/RatingHistoryDTO.java` — expose `contestEndTime`
- `user/service/UserServiceImpl.java` — call renamed repo method, map field

**Frontend (modify):**
- `src/components/profile/ProfilePage.jsx` — drop synthetic start, sort by `contestEndTime`, fix X-axis ticks

**DB (one-time, only if duplicates exist):**
- Dedup query + backfill `contest_end_time`

---

## Verification

- [ ] `./mvnw compile -q` inside `TDTUOJ_backend/` passes.
- [ ] `npm run build` inside `tdtuoj_frontend/` passes.
- [ ] Boot backend. Confirm Hibernate adds `contest_end_time` column and `uk_rating_history_user_contest` constraint without error. If Hibernate errors on the constraint, run the dedup SQL above and reboot.
- [ ] Run the investigation SQL above for the affected user. Expect either: (a) only 2 distinct `contest_id` rows after dedup, or (b) 3 distinct `contest_id` rows confirming the legitimate 3rd contest.
- [ ] Load `/users/<username>` in the browser. Chart should now:
    - Have exactly one tick per real contest (no synthetic "12 Apr 26").
    - Show contests in true chronological order by `contestEndTime`.
    - For the reported user: render `____\` (flat 1500 → drop to 1475) if duplicate found and removed, OR render the truthful 3-contest shape with each tick hover identifying its contest.
- [ ] Manually re-trigger `processRatings` on a test contest (admin re-process) twice and confirm the unique constraint blocks duplicates rather than silently inserting them.

---

## Out of scope

- Recharts version upgrade, tooltip restyle, or any UX polish beyond what's required to render truthful data.
- Backfilling `created_at` — leave as-is; `contestEndTime` supersedes it for chronology.
- Removing the `@CreationTimestamp` annotation — keep it for audit trail.
