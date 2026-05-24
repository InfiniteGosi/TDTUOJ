# Fix Rating History Chart — UserDetailPage / ProfilePage

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans skill. Steps use `- [ ]` syntax.

**Goal:** Make the Rating History line chart on `/users/:username` reflect actual contest outcomes truthfully — eliminate spurious dips, ensure chronological ordering, and prevent duplicate `rating_history` rows.

---

## Context

After the v1 fix (contestEndTime field, ordering, unique constraint, synthetic-start removal, `interval={0}`) the chart **still misrepresents the rating progression**. New evidence from two accounts:

**Account `lol1`** — Contests tab shows 3 rows (Test diff 1500 +0, TDTU Cup 1467 **+0**, TDTU Game 1475 **-25**). Chart plots `1500 → 1467 → 1475` (down-then-up). The arithmetic does **not** chain: TDTU Cup change `+0` ≠ `1467 - 1500`; TDTU Game change `-25` ≠ `1475 - 1467`.

**Account `SuperDog123`** — Contests tab shows 4 rows (Hello 1500 +0, Test diff 1467 **-33**, TDTU Cup 1409 **-25**, TDTU Game 1442 **+0**). Chart plots `1500 → 1467 → 1409 → 1442`. Chain math: Hello→Test diff `-33` checks out (1500→1467); TDTU Cup change `-25` but actual `newRating` is `1409` (delta should be `-58`); TDTU Game change `+0` but actual `newRating` jumps `1409→1442` (delta should be `+33`).

### Real root cause (v1 missed it): **broken rating chain across contests**

Each `RatingHistory` row stores `oldRating` / `newRating` / `ratingChange` as a **snapshot taken at the moment `processRatings(contest)` ran**, against `UserStatistics.currentRating` at that moment. Once any contest is reprocessed (or contests are processed out of chronological end-time order), subsequent rows are **not** recomputed — so `row[n].oldRating ≠ row[n-1].newRating` and the chart's chronological plot of `newRating` no longer traces a coherent path.

Concretely in `ContestRatingService.processRatings()` (`TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingService.java`):

- Lines 61-84 roll back **only this contest's** `ratingChange` from `UserStatistics`, leaving every later contest's history row untouched even though its stored `oldRating` is now stale.
- Lines 115-127 read `stats.currentRating` per-user without considering whether later contests have already mutated it.
- Line 178 stamps `contestEndTime` correctly (v1 fix), but the scheduler (`ContestRatingScheduler:36-37`) iterates `findUnprocessedRatedContests(now)` in repository-default order — **not** sorted by `endTime ASC` — so a contest that ended later can be processed first.

Net effect: panel column "Change" reflects the historical snapshot, panel column "Rating" reflects the snapshot's `newRating`, the chart plots those `newRating` values along the (correct) `contestEndTime` axis — but the three pieces do not reconcile because the chain was never repaired after each rollback.

### Defects (v1) — still relevant background

1. **`@CreationTimestamp` collision** on `rating_history.created_at` — fixed by v1 (`contestEndTime` is now the chronological key).
2. **No DB unique constraint on `(user_id, contest_id)`** — fixed by v1 (`uk_rating_history_user_contest`).
3. **Synthetic start point** — fixed by v1 (removed).
4. **NEW — chain inconsistency** — addressed by v2 below.

---

## Investigation Step (run before/with the fix)

Confirm chain integrity for the affected users. Expect `prev.new_rating == curr.old_rating` walking by `c.end_time ASC`.

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

- If `old_rating[n] ≠ new_rating[n-1]` for any row → **chain broken** (the lol1 / SuperDog123 case). v2 fix below recomputes downstream rows.
- If `(contest_id, user_id)` repeats → duplicate; dedup SQL still applies.
- If chain is clean and chart still wrong → re-open this doc; bug is elsewhere.

---

## v1 (already applied — kept for reference)

Entity `contestEndTime` field, `uk_rating_history_user_contest` unique constraint, `ContestRatingService` populates `contestEndTime`, repo renamed to `findByUserIdOrderByContestEndTimeDescIdDesc`, DTO exposes the field, `UserServiceImpl.getRatingHistory()` maps it, `ProfilePage.RatingChart` sorts by it / drops synthetic point / uses `interval={0}`.

These remain correct. The chart bug persists because the **stored snapshot values are themselves wrong**, not because of ordering or rendering.

---

## Fix Plan — v2 (chain rebuild)

Two complementary changes. Backend is the real fix; frontend tweak is a defensive display so future data anomalies do not lie visually.

### Backend

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestRepository.java`

- [ ] Confirm `findUnprocessedRatedContests(LocalDateTime now)` orders by `endTime ASC`. If not, change its JPQL / derived name (e.g. rename to `findUnprocessedRatedContestsOrderByEndTimeAsc`, or add `ORDER BY c.endTime ASC` in `@Query`). Reason: scheduler must always process older contests first so each `processRatings` sees a clean prior chain.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/RatingHistoryRepository.java`

- [ ] Add `List<RatingHistory> findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(Long userId, LocalDateTime endTime);` — used by the chain-rebuild step to enumerate downstream rows that need their `oldRating` / `newRating` / `ratingChange` rewritten when an upstream contest is reprocessed.
- [ ] Add `List<RatingHistory> findByUserIdOrderByContestEndTimeAscIdAsc(Long userId);` — used by a backfill routine to recompute the entire chain for an affected user.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingService.java`

- [ ] Replace the per-contest snapshot model with a **chain-aware** persistence: keep `ratingChange` as the source of truth, recompute `oldRating` / `newRating` on every affected row.
- [ ] After the existing insert loop (line 192) completes for the freshly-processed contest, for **each affected `userId`** invoke a new private method `rebuildChainFrom(userId, contest.getEndTime())` that:
    1. Loads `findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(userId, contest.endTime)`.
    2. Loads the just-inserted row (or `contest.endTime` row) as the chain seed, taking its `newRating`.
    3. Walks each downstream row in order, setting `oldRating = runningRating`, then `runningRating += row.ratingChange` (cap to `≥1`), then `newRating = runningRating`. Save.
    4. After the walk, sets `UserStatistics.currentRating = runningRating` and bumps `maxRating` if needed. This **overrides** the per-row `stats.setCurrentRating(newRating)` write at line 184 because that write is only correct when no downstream rows exist.
- [ ] In the rollback block (lines 61-84), after deleting this contest's `RatingHistory` rows, also invoke `rebuildChainFrom(userId, contest.getEndTime())` for each affected user **before** the new insert loop runs, so that `stats.currentRating` reflects the chain with this contest removed. The existing arithmetic at line 67 (`stats.currentRating - rh.ratingChange`) is only correct when this is the user's most recent contest by end-time; for older contests it produces the wrong baseline and is what allowed the chain to break in the first place.
- [ ] Keep `ratingChange` computation as-is (seed-vs-rank formula on the participants' chain-correct ratings at this contest's end-time). The `oldRating` fed into the formula must come from "user's `newRating` from the immediately-prior contest by `contestEndTime`, or `DEFAULT_RATING` if none." Replace the line 117 `userStatisticsRepository.findByUserId(...)` lookup with this prior-chain lookup: `ratingHistoryRepository.findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(userId, contest.endTime)` → if present, `oldRating = prior.newRating`, else `oldRating = DEFAULT_RATING`. Add that derived query method to the repo.

**File:** `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingScheduler.java`

- [ ] Confirm the loop at line 46 processes contests in `endTime ASC` order (relies on repo change above). If the repo cannot be changed (e.g. used elsewhere with different ordering), sort `candidates` in-place: `candidates.sort(Comparator.comparing(Contest::getEndTime));`.

### Backend — one-time data fix

After the code change ships, run a one-time backfill that walks every user's existing `rating_history` chronologically and rewrites `old_rating` / `new_rating`. Expose this as a transient admin endpoint (e.g. `POST /api/admin/rating/rebuild-chains`) or run it once via a `CommandLineRunner` guarded by an env flag, then remove. Algorithm (pseudo-SQL — actually do it in Java/JPA for correctness):

```
for each user_id with rows in rating_history:
  running = 1500
  for each row ordered by contest_end_time ASC, id ASC:
    row.old_rating = running
    running = max(1, running + row.rating_change)
    row.new_rating = running
    save(row)
  user_statistics[user_id].current_rating = running
  user_statistics[user_id].max_rating = max(max_rating, max(new_rating over chain))
```

Dedup SQL from v1 still applies if the investigation finds duplicates:

```sql
DELETE FROM rating_history a
USING rating_history b
WHERE a.user_id = b.user_id
  AND a.contest_id = b.contest_id
  AND a.id < b.id;

UPDATE rating_history rh
SET contest_end_time = c.end_time
FROM contest c
WHERE c.id = rh.contest_id
  AND rh.contest_end_time IS NULL;
```

Run dedup + `contest_end_time` backfill **before** the chain-rebuild routine.

### Frontend

**File:** `tdtuoj_frontend/src/components/profile/ProfilePage.jsx`

- [ ] In `RatingChart` (around line 302), stop plotting `p.newRating` directly. Compute `chartData[i].rating` as a running fold over `ratingChange` starting from `points[0].oldRating ?? 1500`. This makes the chart self-consistent even if a single row's stored `newRating` ever drifts again. The tooltip should still surface `p.ratingChange` and `p.rank` from the row (those remain truthful).
- [ ] In the Contests table (around line 949), also recompute the displayed `Rating` column the same way (running fold) instead of `c.newRating`, so panel and chart always agree. Tooltip / Change column continues to use `c.ratingChange`.
- [ ] Add a dev-only `console.assert` (gated by `import.meta.env.DEV`) that walks `points` chronologically and warns if `points[i].oldRating !== points[i-1].newRating` — early-warning for future drift.

**File:** `tdtuoj_frontend/src/services/ApiService.js`

- [ ] No change.

---

## File Map (Summary — v2 delta on top of v1)

**Backend (modify):**
- `contest/repository/ContestRepository.java` — `findUnprocessedRatedContests` must order by `endTime ASC`
- `contest/repository/RatingHistoryRepository.java` — add chain-walk queries (`findByUserIdAndContestEndTimeGreaterThan…`, `findByUserIdOrderByContestEndTimeAscIdAsc`, `findTopByUserIdAndContestEndTimeLessThan…`)
- `contest/service/ContestRatingService.java` — derive `oldRating` from prior chain row not `stats.currentRating`; add `rebuildChainFrom(userId, fromEndTime)`; invoke after every insert and after rollback; final `stats.currentRating` is the chain tail
- `contest/service/ContestRatingScheduler.java` — guarantee `endTime ASC` processing order (sort in-place if repo ordering not changed)
- New one-shot admin/CLI route to rebuild all users' chains

**Frontend (modify):**
- `src/components/profile/ProfilePage.jsx` — `RatingChart` and Contests table compute displayed rating as running fold of `ratingChange` for self-consistency; dev assert on chain integrity

**DB (one-time):**
- Dedup, `contest_end_time` backfill (from v1), then chain rebuild routine.

---

## Verification

- [ ] `./mvnw compile -q` inside `TDTUOJ_backend/` passes.
- [ ] `npm run build` inside `tdtuoj_frontend/` passes.
- [ ] Investigation SQL for `lol1` and `SuperDog123` returns rows whose `old_rating[n] == new_rating[n-1]` walking `c.end_time ASC` (chain integrity restored by backfill).
- [ ] On `/users/lol1`: Chart values match Contests panel exactly. Each contest row's `rating - prev.rating == ratingChange`.
- [ ] On `/users/SuperDog123`: same check across all 4 contests; specifically TDTU Cup change matches `1409 - 1467` (or whatever the post-rebuild value is — the point is `change` and `rating` reconcile).
- [ ] Admin re-process a contest in the middle of the chain: all downstream rows' `oldRating` / `newRating` get rewritten; `UserStatistics.currentRating` equals the chain tail.
- [ ] Scheduler logs show `endTime ASC` processing order when multiple contests end in the same tick.
- [ ] Dev-mode `console.assert` is silent on a healthy profile.

---

## Out of scope

- Recharts version upgrade, tooltip restyle, or any UX polish beyond what's required to render truthful data.
- Backfilling `created_at` — leave as-is; `contestEndTime` supersedes it for chronology.
- Removing the `@CreationTimestamp` annotation — keep it for audit trail.
- Changing the seed-vs-rank delta formula itself. v2 only fixes how stored snapshots stay consistent; the delta math is unchanged.
- Migrating to a derived (compute-on-read) model where `oldRating` / `newRating` are not stored at all. Tempting, but defers the cost to every profile load and breaks any analytics that read `new_rating` directly. The chain-rebuild approach keeps reads cheap and writes idempotent.
