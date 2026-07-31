# IOI-Style Contest Grading — Implementation Runbook

> **Repo root**: `d:\OJ`  
> **Goal**: Enable IOI-style partial scoring in contests alongside ICPC.  
> **ICPC** = all-or-nothing (must pass every test case to score a problem).  
> **IOI** = partial scoring (each test case awards `problemPoints / totalTestCases` points; best submission per problem is kept).  
> **Database changes**: NONE. All needed columns/enums already exist.

---

## Step 1 — Unlock IOI in `validateContestStyle`

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java`  
**Line**: ~448

**BEFORE:**
```java
private void validateContestStyle(ContestStyle style) {
    if (style != null && style != ContestStyle.ICPC) {
        throw new BadRequestException("Only ICPC style contests are supported");
    }
}
```

**AFTER:**
```java
private void validateContestStyle(ContestStyle style) {
    if (style != null && style != ContestStyle.ICPC && style != ContestStyle.IOI) {
        throw new BadRequestException("Only ICPC and IOI style contests are supported");
    }
}
```

### Step 1b — Guard: block style change after submissions exist

**Same file**: `ContestServiceImpl.java`  
**Line**: ~187–190

The `updateContest` method currently allows changing `contestStyle` freely. This is dangerous once submissions exist because ICPC and IOI use incompatible scoring models (penalty vs partial points). Block the change if the contest already has submissions.

**BEFORE:**
```java
if (dto.getContestStyle()      != null) {
    validateContestStyle(dto.getContestStyle());
    contest.setContestStyle(dto.getContestStyle());
}
```

**AFTER:**
```java
if (dto.getContestStyle()      != null) {
    validateContestStyle(dto.getContestStyle());
    if (dto.getContestStyle() != contest.getContestStyle()
            && submissionRepository.countByContestId(contest.getId()) > 0) {
        throw new BadRequestException(
                "Cannot change contest style after submissions have been made");
    }
    contest.setContestStyle(dto.getContestStyle());
}
```

> This lets creators freely switch styles while setting up the contest, but locks it once the first submission comes in.

---

## Step 2 — Add repository query for best prior test-cases-passed

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java`

**Add this method** (anywhere in the interface, e.g. after line 73):

```java
/** IOI: best test-case count for a user+problem in a contest, excluding a given submission. */
@org.springframework.data.jpa.repository.Query(
    "SELECT MAX(s.testCasesPassed) FROM Submission s " +
    "WHERE s.userId = :userId AND s.problem.id = :problemId " +
    "AND s.contestId = :contestId AND s.id <> :excludeId " +
    "AND s.submissionStatus = com.oj.TDTUOJ.common.enums.SubmissionStatus.COMPLETED")
Integer findMaxTestCasesPassedForUserProblemContest(
    @org.springframework.data.repository.query.Param("userId") Long userId,
    @org.springframework.data.repository.query.Param("problemId") Long problemId,
    @org.springframework.data.repository.query.Param("contestId") Long contestId,
    @org.springframework.data.repository.query.Param("excludeId") Long excludeId);
```

---

## Step 3 — Add `recordIOISubmission` to `ContestLeaderboardService`

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestLeaderboardService.java`

**Add this public method** after `recordAcceptedSubmission` (after line ~169):

```java
/**
 * IOI leaderboard update. Called after every score-improving contest submission.
 * ZSET score = total points (no penalty component).
 */
public void recordIOISubmission(
        Long contestId, Long userId,
        String username, String profileUrl,
        Long problemId, Integer problemOrder,
        Integer totalPoints, Integer problemsSolved,
        ScoreboardEntryDTO.ProblemScoreDTO problemMeta) {

    String zsetKey = LB_ZSET_KEY + contestId;
    if (!Boolean.TRUE.equals(redisTemplate.hasKey(zsetKey))) {
        initLeaderboard(contestId);
    }

    double score = totalPoints != null ? totalPoints : 0;
    redisTemplate.opsForZSet().add(zsetKey, userId.toString(), score);

    HashOperations<String, String, String> hops = redisTemplate.opsForHash();
    writeMeta(hops, contestId, userId, username, profileUrl,
            0, problemsSolved, ContestParticipationType.CONTESTANT);

    // Store total points in the meta hash for IOI display
    String metaKey = META_HASH_KEY + contestId + ":" + userId;
    hops.put(metaKey, "pointsEarned", String.valueOf(totalPoints != null ? totalPoints : 0));

    writeProblemStatus(hops, contestId, userId, problemId, problemMeta);
    redisTemplate.delete(CACHE_KEY + contestId);

    log.info("IOI leaderboard updated: contestId={} userId={} totalPoints={}",
            contestId, userId, totalPoints);

    persistRankAsync(contestId, userId, problemsSolved, 0, (long) score);
}
```

**Also update `buildEntry`** (line ~380–382). Find these two lines:

```java
int solved  = entry.getProblemsSolved() == null ? 0 : entry.getProblemsSolved();
entry.setScore(solved); // In ICPC, "score" = problems solved
```

**Replace with:**

```java
int solved  = entry.getProblemsSolved() == null ? 0 : entry.getProblemsSolved();
entry.setScore(solved); // ICPC default: "score" = problems solved

// IOI: override score with pointsEarned if present in meta
String pointsStr = meta.get("pointsEarned");
if (pointsStr != null) {
    int pts = parseInt(pointsStr);
    entry.setPointsEarned(pts);
    entry.setScore(pts); // IOI: score = total points
}
```

---

## Step 4 — Add `contestStyle` to `LeaderboardDTO`

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/dto/LeaderboardDTO.java`

**Add field** (after line 27, next to `totalParticipants`):

```java
private String contestStyle;
```

> Use `String` not `ContestStyle` enum so Jackson serialises it as `"ICPC"` / `"IOI"` without import issues.

**Then update `buildLeaderboard`** in `ContestLeaderboardService.java` (line ~353–360). Find the builder:

```java
return LeaderboardDTO.builder()
        .contestId(contest.getId())
        .contestName(contest.getName())
        .contestSlug(contest.getSlug())
```

**Add** `.contestStyle(contest.getContestStyle() != null ? contest.getContestStyle().name() : "ICPC")` right after `.contestSlug(...)`.

---

## Step 5 — Modify the judging loop in `SubmissionJudgeService`

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/service/SubmissionJudgeService.java`

### 5a — Add import (top of file)

```java
import com.oj.TDTUOJ.common.enums.ContestStyle;
```

### 5b — Resolve contest style after loading problem (after line 93)

**Add these lines** between lines 93 and 95:

```java
// Resolve contest style (IOI needs all test cases to run)
ContestStyle contestStyle = null;
if (job.getContestId() != null) {
    contestStyle = contestRepository.findById(job.getContestId())
            .map(Contest::getContestStyle).orElse(null);
}
```

### 5c — Change the test-case loop break (lines 139–144)

**BEFORE:**
```java
} else {
    // First failing case decides the verdict for the whole submission. No point
    // running remaining cases — record the verdict + error and bail out.
    finalVerdict = result.verdict();
    errorMessage = result.errorMessage();
    break; // stop on first failure
}
```

**AFTER:**
```java
} else {
    finalVerdict = result.verdict();
    errorMessage = result.errorMessage();
    // ICPC: stop on first failure. IOI: keep running all test cases for partial scoring.
    if (contestStyle != ContestStyle.IOI) {
        break;
    }
}
```

### 5d — After the loop, fix IOI final verdict (before line 163)

**Add** between the try/catch block (line 159) and the "step 3" comment (line 161):

```java
// IOI: final verdict is AC only if ALL test cases passed
if (contestStyle == ContestStyle.IOI && passed == testCases.size()) {
    finalVerdict = SubmissionVerdict.AC;
}
```

### 5e — Change the leaderboard trigger (lines 213–216)

**BEFORE:**
```java
// 5. Update the real-time leaderboard for contest submissions
if (isAccepted && !isPractice) {
    updateContestLeaderboard(job, submission, problem);
}
```

**AFTER:**
```java
// 5. Update the real-time leaderboard for contest submissions
if (!isPractice) {
    if (contestStyle == ContestStyle.IOI) {
        updateIOILeaderboard(job, submission, problem, passed, testCases.size());
    } else if (isAccepted) {
        updateContestLeaderboard(job, submission, problem);
    }
}
```

### 5f — Add `updateIOILeaderboard` method (after `updateContestLeaderboard`, e.g. after line 348)

```java
// ────────────────────────────────────────────────────────────────────────
// IOI Leaderboard update
// ────────────────────────────────────────────────────────────────────────

/**
 * IOI leaderboard update — called after EVERY completed contest submission.
 * Score = (passed / total) × contestProblem.points. Keeps the best score per problem.
 */
private void updateIOILeaderboard(
        SubmissionJobDTO job, Submission submission, Problem problem,
        int passed, int totalTestCases) {
    Long contestId = job.getContestId();
    try {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        User user = userRepository.findById(job.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found: " + job.getUserId()));

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(contest.getStartTime()) || now.isAfter(contest.getEndTime())) return;

        boolean isRegistered = contestRegistrationRepository
                .existsByContestIdAndUserIdAndStatus(
                        contestId, job.getUserId(), ContestRegistrationStatus.APPROVED);
        if (!isRegistered) return;

        ContestProblem contestProblem = contestProblemRepository
                .findByContestIdAndProblemId(contestId, problem.getId()).orElse(null);
        if (contestProblem == null) return;

        int maxPoints = contestProblem.getPoints() != null ? contestProblem.getPoints() : 100;
        int earnedPoints = totalTestCases > 0
                ? (int) Math.round((double) passed * maxPoints / totalTestCases) : 0;

        ContestParticipation participation = contestParticipationRepository
                .findByContestIdAndUserId(contestId, job.getUserId())
                .orElseGet(() -> contestParticipationRepository.save(
                        ContestParticipation.builder().contest(contest).user(user).build()));

        // Best prior score for this problem in this contest
        Integer bestPriorPassed = submissionRepository
                .findMaxTestCasesPassedForUserProblemContest(
                        job.getUserId(), problem.getId(), contestId, submission.getId());
        int bestPriorPoints = bestPriorPassed != null && totalTestCases > 0
                ? (int) Math.round((double) bestPriorPassed * maxPoints / totalTestCases) : 0;

        int improvement = earnedPoints - bestPriorPoints;
        if (improvement <= 0 && bestPriorPassed != null) return; // no improvement

        int newTotalPoints = participation.getPointsEarned() + improvement;
        int newSolved = participation.getProblemsSolved()
                + (earnedPoints == maxPoints && bestPriorPoints < maxPoints ? 1 : 0);

        participation.setPointsEarned(newTotalPoints);
        participation.setScore(newTotalPoints);
        participation.setProblemsSolved(newSolved);
        participation.setPenaltyTime(0);
        contestParticipationRepository.save(participation);

        ScoreboardEntryDTO.ProblemScoreDTO probStatus = new ScoreboardEntryDTO.ProblemScoreDTO();
        probStatus.setProblemId(problem.getId());
        probStatus.setProblemOrder(contestProblem.getProblemOrder());
        probStatus.setSolved(earnedPoints == maxPoints);
        probStatus.setAttempts(0);
        probStatus.setPenaltyMinutes(0);
        probStatus.setPointsEarned(earnedPoints);

        leaderboardService.recordIOISubmission(
                contestId, job.getUserId(), user.getUsername(), user.getProfileUrl(),
                problem.getId(), contestProblem.getProblemOrder(),
                newTotalPoints, newSolved, probStatus);

        log.info("IOI leaderboard updated: contestId={} userId={} points={} total={}",
                contestId, job.getUserId(), earnedPoints, newTotalPoints);
    } catch (Exception e) {
        log.error("Failed to update IOI leaderboard for contestId={} userId={}",
                contestId, job.getUserId(), e);
    }
}
```

---

## Step 6 — IOI ranking in `ContestRatingService`

**File**: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestRatingService.java`

**Add import** at the top:
```java
import com.oj.TDTUOJ.common.enums.ContestStyle;
```

**Replace** the sort block (lines ~90–99):

**BEFORE:**
```java
// 1. Sort participations by ICPC rules: most problems solved DESC, then lowest penalty ASC.
//    We do NOT trust cp.getRank() because it is updated asynchronously and may be stale.
participations.sort((a, b) -> {
    int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
    int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
    if (solvedA != solvedB) return Integer.compare(solvedB, solvedA); // desc
    int penaltyA = a.getPenaltyTime() != null ? a.getPenaltyTime() : 0;
    int penaltyB = b.getPenaltyTime() != null ? b.getPenaltyTime() : 0;
    return Integer.compare(penaltyA, penaltyB); // asc
});
```

**AFTER:**
```java
// 1. Sort participations by contest style.
//    We do NOT trust cp.getRank() because it is updated asynchronously and may be stale.
if (contest.getContestStyle() == ContestStyle.IOI) {
    // IOI: highest total points DESC, tiebreak by most problems solved DESC
    participations.sort((a, b) -> {
        int ptsA = a.getPointsEarned() != null ? a.getPointsEarned() : 0;
        int ptsB = b.getPointsEarned() != null ? b.getPointsEarned() : 0;
        if (ptsA != ptsB) return Integer.compare(ptsB, ptsA);
        int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
        int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
        return Integer.compare(solvedB, solvedA);
    });
} else {
    // ICPC: most problems solved DESC, then lowest penalty ASC
    participations.sort((a, b) -> {
        int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
        int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
        if (solvedA != solvedB) return Integer.compare(solvedB, solvedA);
        int penaltyA = a.getPenaltyTime() != null ? a.getPenaltyTime() : 0;
        int penaltyB = b.getPenaltyTime() != null ? b.getPenaltyTime() : 0;
        return Integer.compare(penaltyA, penaltyB);
    });
}
```

---

## Step 7 — Frontend: Admin form — Contest Style dropdown

**File**: `TDTUOJ_frontend/src/components/admin/AdminContestFormPage.jsx`

### 7a — Submit payload (line 328)

**BEFORE:**
```js
isPublic: true, isRated: form.isRated, contestStyle: "ICPC",
```

**AFTER:**
```js
isPublic: true, isRated: form.isRated, contestStyle: form.contestStyle,
```

### 7b — Sticky bar badge (lines 362–368)

**BEFORE:**
```jsx
<span style={{
  padding: "3px 12px", borderRadius: 9999,
  background: "var(--primary-subtle)", color: "var(--primary)",
  fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.1em",
}}>
  ICPC STYLE
</span>
```

**AFTER:**
```jsx
<span style={{
  padding: "3px 12px", borderRadius: 9999,
  background: "var(--primary-subtle)", color: "var(--primary)",
  fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.1em",
}}>
  {form.contestStyle} STYLE
</span>
```

### 7c — Add Contest Style selector in SETTINGS card (line ~474, after the Scoreboard Freeze block, before the Rated toggle)

**Add this block:**
```jsx
{/* Contest Style */}
<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
  <label style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contest Style</label>
  <div style={{ display: "flex", gap: 6 }}>
    {["ICPC", "IOI"].map((style) => (
      <button key={style} type="button" onClick={() => set("contestStyle", style)}
        style={{
          padding: "7px 18px", borderRadius: "var(--radius-md)", cursor: "pointer",
          fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 700,
          letterSpacing: "0.05em", transition: "all 0.12s",
          background: form.contestStyle === style ? "var(--primary)" : "var(--bg-raised)",
          color: form.contestStyle === style ? "var(--bg-void)" : "var(--text-muted)",
          border: `1px solid ${form.contestStyle === style ? "var(--primary)" : "var(--border-default)"}`,
        }}>
        {style}
      </button>
    ))}
  </div>
  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
    {form.contestStyle === "IOI" ? "Partial scoring — points per test case passed" : "All-or-nothing — must pass every test case"}
  </span>
</div>
```

---

## Step 8 — Frontend: Dual-mode `LeaderboardTable`

**File**: `TDTUOJ_frontend/src/components/contests/ContestDetailPage.jsx`

### 8a — Pass `contestStyle` prop (line ~643)

**BEFORE:**
```jsx
<LeaderboardTable contestId={contest.id} problems={problems} />
```

**AFTER:**
```jsx
<LeaderboardTable contestId={contest.id} problems={problems} contestStyle={contest.contestStyle} />
```

### 8b — Accept prop in component signature (line ~138)

**BEFORE:**
```jsx
const LeaderboardTable = ({ contestId, problems }) => {
```

**AFTER:**
```jsx
const LeaderboardTable = ({ contestId, problems, contestStyle }) => {
```

### 8c — Also read `contestStyle` from the fetched data (after line 149)

After `if (resp.statusCode === 200) setData(resp.data);` — the `data` object already contains `contestStyle` from the DTO we updated in Step 4. No extra fetch needed.

### 8d — Header columns (lines 207–208)

**BEFORE:**
```jsx
<th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--green-ac)", letterSpacing: "0.05em" }}>SOLVED</th>
<th style={{ width: "12%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>PENALTY</th>
```

**AFTER:**
```jsx
{(data?.contestStyle || contestStyle) === "IOI" ? (
  <>
    <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.05em" }}>SCORE</th>
    <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--green-ac)", letterSpacing: "0.05em" }}>SOLVED</th>
  </>
) : (
  <>
    <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--green-ac)", letterSpacing: "0.05em" }}>SOLVED</th>
    <th style={{ width: "12%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>PENALTY</th>
  </>
)}
```

### 8e — Data row cells (lines 245–250)

**BEFORE:**
```jsx
<td style={{ textAlign: "center", padding: "10px 8px" }}>
  <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--green-ac)" }}>{entry.problemsSolved ?? 0}</span>
</td>
<td style={{ textAlign: "center", padding: "10px 8px" }}>
  <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{fmtMins(entry.penaltyTime)}</span>
</td>
```

**AFTER:**
```jsx
{(data?.contestStyle || contestStyle) === "IOI" ? (
  <>
    <td style={{ textAlign: "center", padding: "10px 8px" }}>
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--primary)" }}>{entry.pointsEarned ?? entry.score ?? 0}</span>
    </td>
    <td style={{ textAlign: "center", padding: "10px 8px" }}>
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--green-ac)" }}>{entry.problemsSolved ?? 0}</span>
    </td>
  </>
) : (
  <>
    <td style={{ textAlign: "center", padding: "10px 8px" }}>
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--green-ac)" }}>{entry.problemsSolved ?? 0}</span>
    </td>
    <td style={{ textAlign: "center", padding: "10px 8px" }}>
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{fmtMins(entry.penaltyTime)}</span>
    </td>
  </>
)}
```

### 8f — Per-problem cell (lines 255–265)

Inside the `{ps ? (` block, wrap the existing ICPC rendering in a style check:

**BEFORE:**
```jsx
{ps ? (
  ps.solved ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <CheckCircle size={14} color="var(--green-ac)" />
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {ps.attempts > 0 ? `+${ps.attempts} ` : ""}{fmtMins(ps.penaltyMinutes)}
      </span>
    </div>
  ) : (
    <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--red-wa)", fontWeight: 700 }}>-{ps.attempts}</span>
  )
) : (
```

**AFTER:**
```jsx
{ps ? (
  (data?.contestStyle || contestStyle) === "IOI" ? (
    <span style={{
      fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", fontWeight: 700,
      color: ps.pointsEarned === (p.points ?? 100) ? "var(--green-ac)"
           : ps.pointsEarned > 0 ? "var(--amber-tle)" : "var(--red-wa)",
    }}>
      {ps.pointsEarned ?? 0}/{p.points ?? 100}
    </span>
  ) : ps.solved ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <CheckCircle size={14} color="var(--green-ac)" />
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {ps.attempts > 0 ? `+${ps.attempts} ` : ""}{fmtMins(ps.penaltyMinutes)}
      </span>
    </div>
  ) : (
    <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--red-wa)", fontWeight: 700 }}>-{ps.attempts}</span>
  )
) : (
```

---

## Verification

**Backend compile:**
```bash
cd D:/OJ/TDTUOJ_backend
./mvnw compile -q
```

**Frontend build:**
```bash
cd D:/OJ/tdtuoj_frontend
npm run build
```

Both must exit 0.

---

## Files changed (summary)

| # | File | Change |
|---|---|---|
| 1 | `ContestServiceImpl.java` | 1-line fix in `validateContestStyle` |
| 2 | `SubmissionRepository.java` | Add 1 query method |
| 3 | `ContestLeaderboardService.java` | Add `recordIOISubmission` method + update `buildEntry` |
| 4 | `LeaderboardDTO.java` | Add `contestStyle` field |
| 5 | `SubmissionJudgeService.java` | Resolve style, conditional break, new trigger, add `updateIOILeaderboard` |
| 6 | `ContestRatingService.java` | IOI sort branch |
| 7 | `AdminContestFormPage.jsx` | Style dropdown, use `form.contestStyle` in payload |
| 8 | `ContestDetailPage.jsx` | Dual-mode leaderboard table |

**No changes to**: `ContestStyle.java`, `Contest.java`, `ContestParticipation.java`, `ScoreboardEntryDTO.java`, `ContestDTO.java`, any DB migration.

---

## Appendix — IOI Smoke-Test Problem

Use this problem to manually verify IOI partial scoring end-to-end.

### Problem Statement

**BST Search**

Insert a sequence of integers into a Binary Search Tree (BST) one by one. If a value already exists in the tree, ignore the duplicate. After constructing the BST, search for a target value and determine whether it exists in the tree.

#### Input format

The first line contains a single integer `N` — the number of values to insert.

The second line contains `N` space-separated integers.

The third line contains a single integer representing the target value to search for.

#### Output format

Print `FOUND` if the target exists in the BST. Otherwise, print `NOT FOUND`.

#### Sample test case 1

Input

```text
7
5 3 7 2 4 6 8
6
```

Output

```text
FOUND
```

#### Sample test case 2

Input

```text
5
10 5 15 3 8
12
```

Output

```text
NOT FOUND
```

---

### Test Cases (5 total — 100 points, 20 pts each)

| # | Input | Expected Output | Notes |
|---|---|---|---|
| 1 | `7`<br>`5 3 7 2 4 6 8`<br>`6` | `FOUND` | Target is an interior node |
| 2 | `5`<br>`10 5 15 3 8`<br>`12` | `NOT FOUND` | Target not present |
| 3 | `6`<br>`1 2 3 4 5 6`<br>`1` | `FOUND` | Right-skewed tree, root searched |
| 4 | `4`<br>`9 4 4 7`<br>`4` | `FOUND` | Duplicate input — 4 inserted once |
| 5 | `1`<br>`42`<br>`100` | `NOT FOUND` | Single-element tree |

**Full test case files** (paste verbatim as input/expected output when creating test cases in the admin panel):

**TC1 input:**
```
7
5 3 7 2 4 6 8
6
```
**TC1 output:** `FOUND`

**TC2 input:**
```
5
10 5 15 3 8
12
```
**TC2 output:** `NOT FOUND`

**TC3 input:**
```
6
1 2 3 4 5 6
1
```
**TC3 output:** `FOUND`

**TC4 input:**
```
4
9 4 4 7
4
```
**TC4 output:** `FOUND`

**TC5 input:**
```
1
42
100
```
**TC5 output:** `NOT FOUND`

---

### Reference C++ Solution (passes all 5 test cases — AC)

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* left;
    Node* right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int val) {
    if (!root) return new Node(val);
    if (val < root->val)      root->left  = insert(root->left,  val);
    else if (val > root->val) root->right = insert(root->right, val);
    // equal: duplicate, ignore
    return root;
}

bool search(Node* root, int target) {
    if (!root) return false;
    if (target == root->val) return true;
    if (target < root->val)  return search(root->left,  target);
    return search(root->right, target);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n; cin >> n;
    Node* root = nullptr;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        root = insert(root, x);
    }

    int target; cin >> target;
    cout << (search(root, target) ? "FOUND" : "NOT FOUND") << "\n";
    return 0;
}
```

### Partial-scoring test submissions for IOI verification

To verify partial scoring works, submit these deliberately broken solutions:

**Passes TC1 & TC3 only (2/5 = 40 pts) — hardcoded FOUND:**
```cpp
#include <bits/stdc++.h>
using namespace std;
int main() {
    // Reads input but always prints FOUND
    int n; cin >> n;
    for (int i = 0; i < n; i++) { int x; cin >> x; }
    int t; cin >> t;
    cout << "FOUND\n";
    return 0;
}
```
Expected leaderboard entry: **40/100** (amber color).

**Passes all 5 (5/5 = 100 pts) — the reference solution above:**
Expected leaderboard entry: **100/100** (green color, problem marked solved).

---

### Setup checklist for smoke test

1. Create a new contest with style **IOI**, set short duration (e.g. 30 mins).
2. Create the **BST Search** problem (private, 100 points, time limit 1s).
3. Add **5 test cases** using the inputs/outputs from the table above.
4. Add the problem to the contest with **100 points**.
5. Register a test user.
6. Submit the **always-FOUND** solution → leaderboard should show **40/100**.
7. Submit the **reference solution** → leaderboard should update to **100/100**, solved count `1`.
8. Verify a second user with 0 points ranks below the first.
9. After contest ends, verify rating computation runs without errors.
