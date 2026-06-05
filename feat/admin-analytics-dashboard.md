# Admin Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an analytics dashboard at `/admin/dashboard` (admin-only) showing platform-wide statistics: total counts (problems / users / submissions / contests / organizations), problem breakdown by difficulty and by tag, user registrations over time, submissions over time with verdict distribution, and a top-solvers leaderboard.

**Architecture:** New backend module `dashboard` (`com.oj.TDTUOJ.dashboard`) exposing one aggregate endpoint `GET /api/admin/dashboard` guarded by `@PreAuthorize("hasAuthority('ADMIN')")`. All numbers come from JPQL aggregate queries added to existing repositories (`ProblemRepository`, `UserRepository`, `SubmissionRepository`, `UserStatisticsRepository`) — no schema changes. Frontend gets a new `AdminDashboardPage.jsx` rendered inside the existing `AdminLayout`, reusing the established **recharts v3.8.1** chart patterns: donut/pie style from `ProfilePage.jsx` (`LanguageDonutChart`) and `AdminContestMonitorPage.jsx` (`DonutChart`), line/area style from `ProfilePage.jsx` (`RatingChart`). A new **Dashboard** nav item is added to `AdminSideBar.jsx` (admin-only, like Users).

**Tech Stack:** Spring Boot 3.5 / Spring Data JPA (JPQL aggregates) backend; React 19 + recharts 3.8.1 + lucide-react frontend. No new dependencies.

---

## UX Spec

| Element | Behavior |
|---|---|
| Route | `/admin/dashboard`, nested in `AdminLayout`, wrapped in `AdminRoute` (admin only, mirrors `/admin/users`). |
| Sidebar | New nav item **Dashboard** with `LayoutDashboard` icon (already imported in `AdminSideBar.jsx`), shown only when `ApiService.isAdmin()`, placed first in the list. |
| Stat cards row | 5 cards across the top: Total Problems, Total Users, Total Submissions, Total Contests, Total Organizations. Each card: big number + small label + lucide icon, styled with theme CSS variables (`--bg-surface`, `--border-subtle`, `--text-muted`) like the stat tiles on HomePage / ProfilePage. |
| Problems by difficulty | Donut chart (EASY / MEDIUM / HARD) with center label = total problem count. Colors: green / amber / red, matching difficulty badge colors used elsewhere. Custom tooltip shows count + percentage (copy `PieTooltip` pattern from `ProfilePage.jsx:93-116`). |
| Problems by tag | Horizontal bar list (top 10 tags by problem count) OR recharts `BarChart` — tag name + count + proportional bar. Fallback text when no tags. |
| Users over time | Line+Area chart (`ComposedChart`, copy `RatingChart` pattern from `ProfilePage.jsx:290-404`): cumulative registered users per month for the last 12 months. X axis = month label, Y axis = cumulative count. |
| Submissions over time | Same line+area style: submissions per day for the last 30 days. |
| Verdict distribution | Donut of AC / WA / TLE / MLE / RE / CE across all submissions, center label = overall AC rate %, color-coded center label (green ≥60%, amber 30–59%, red <30%) — copy `DonutChart` from `AdminContestMonitorPage.jsx:106-169`. |
| Top solvers | Table (rank, avatar+username link to `/users/:username`, problems solved, acceptance rate, current rating), top 10 by `problemsSolved`. Username links open public profile. |
| Loading / error | Single skeleton/spinner while the aggregate endpoint loads; toast on error (existing `ToastProvider`). |
| Responsiveness | Charts wrapped in `ResponsiveContainer`; grid collapses to single column under ~900px. |

---

## API Design

`GET /api/admin/dashboard` → `Response<DashboardStatsDTO>` (one round-trip; all sections in a single payload):

```json
{
  "totals": { "problems": 0, "users": 0, "submissions": 0, "contests": 0, "organizations": 0 },
  "problemsByDifficulty": [ { "name": "EASY", "value": 0 } ],
  "problemsByTag": [ { "name": "dp", "value": 0 } ],
  "usersOverTime": [ { "period": "2025-07", "count": 0, "cumulative": 0 } ],
  "submissionsOverTime": [ { "period": "2026-05-07", "count": 0 } ],
  "verdictDistribution": [ { "name": "AC", "value": 0 } ],
  "topSolvers": [ { "userId": 0, "username": "", "avatarUrl": "", "problemsSolved": 0, "acceptanceRate": 0.0, "currentRating": 0 } ]
}
```

Notes:
- `User.createdAt` exists (`User.java:64`) — grouping by month is possible without schema changes.
- `UserStatistics` already stores `problemsSolved`, `acceptanceRate`, `currentRating` (`userStatistics/entity/UserStatistics.java`) — top solvers is a simple `ORDER BY problemsSolved DESC LIMIT 10` join to `User` for username/avatar.
- Problem counts include both public and private problems (this is the admin view); if desired later, a `publicOnly` query param can be added.

---

## File Map

**Backend (create):**
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/dashboard/dto/DashboardStatsDTO.java` — aggregate DTO (+ nested static DTOs: `Totals`, `NameCount`, `TimePoint`, `TopSolverDTO`)
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/dashboard/service/DashboardService.java` — interface
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/dashboard/service/DashboardServiceImpl.java` — aggregation logic
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/dashboard/controller/DashboardController.java` — `GET /api/admin/dashboard`

**Backend (modify):**
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/repository/ProblemRepository.java` — difficulty + tag aggregate queries
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/user/repository/UserRepository.java` — registrations-by-month query
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java` — verdict distribution + submissions-per-day queries
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/userStatistics/repository/UserStatisticsRepository.java` — top solvers query

**Frontend (create):**
- `tdtuoj_frontend/src/components/admin/AdminDashboardPage.jsx` — the dashboard page (stat cards, charts, top-solvers table)

**Frontend (modify):**
- `tdtuoj_frontend/src/services/ApiService.js` — add `getAdminDashboardStats()`
- `tdtuoj_frontend/src/components/admin/AdminSideBar.jsx` — add Dashboard nav item (admin-only)
- `tdtuoj_frontend/src/App.jsx` — add `/admin/dashboard` route with `AdminRoute` guard

---

## Task 1: Backend — repository aggregate queries

**Files:**
- Modify: `ProblemRepository.java`, `UserRepository.java`, `SubmissionRepository.java`, `UserStatisticsRepository.java`

- [x] **Step 1: Problems by difficulty + by tag** (`ProblemRepository.java`)

```java
@Query("SELECT p.difficulty AS name, COUNT(p) AS value FROM Problem p GROUP BY p.difficulty")
List<Object[]> countByDifficultyGrouped();

@Query("SELECT t.name AS name, COUNT(p) AS value FROM Problem p JOIN p.tags t GROUP BY t.name ORDER BY COUNT(p) DESC")
List<Object[]> countByTagGrouped(Pageable pageable); // pass PageRequest.of(0, 10)
```

(Match actual field names in `Problem.java` — difficulty column is `problem_difficulty`, entity field name may differ; verify before writing the JPQL.)

- [x] **Step 2: User registrations per month** (`UserRepository.java`)

```java
@Query("SELECT FUNCTION('to_char', u.createdAt, 'YYYY-MM') AS period, COUNT(u) AS cnt " +
       "FROM User u WHERE u.createdAt >= :since GROUP BY 1 ORDER BY 1")
List<Object[]> countRegistrationsByMonth(@Param("since") LocalDateTime since);
```

(PostgreSQL `to_char` via `FUNCTION()`; `since` = first day of month, 11 months ago.)

- [x] **Step 3: Verdict distribution + submissions per day** (`SubmissionRepository.java`)

```java
@Query("SELECT s.submissionVerdict AS name, COUNT(s) AS value FROM Submission s WHERE s.submissionVerdict IS NOT NULL GROUP BY s.submissionVerdict")
List<Object[]> countByVerdictGrouped();

@Query("SELECT FUNCTION('to_char', s.submissionDate, 'YYYY-MM-DD') AS period, COUNT(s) AS cnt " +
       "FROM Submission s WHERE s.submissionDate >= :since GROUP BY 1 ORDER BY 1")
List<Object[]> countSubmissionsByDay(@Param("since") LocalDateTime since);
```

(Verify actual field names — `submissionVerdict` / `submissionDate` per `SubmissionDTO`; check `Submission.java` entity.)

- [x] **Step 4: Top solvers** (`UserStatisticsRepository.java`)

```java
List<UserStatistics> findTop10ByOrderByProblemsSolvedDescAcceptedSubmissionsDesc();
```

Then resolve username/avatar via `UserRepository.findAllById(userIds)` in the service (avoids a custom join if `UserStatistics` has no `@ManyToOne` to `User` — it stores raw `userId`).

---

## Task 2: Backend — dashboard module (DTO, service, controller)

**Files:**
- Create: `dashboard/dto/DashboardStatsDTO.java`, `dashboard/service/DashboardService.java`, `dashboard/service/DashboardServiceImpl.java`, `dashboard/controller/DashboardController.java`

- [x] **Step 1: DTO** — `DashboardStatsDTO` with `@Data @Builder`, nested static classes per the API Design section. Use `List<NameCount>` (`name`, `value`) for difficulty/tag/verdict; `List<TimePoint>` (`period`, `count`, `cumulative`) for time series; `List<TopSolverDTO>` for leaderboard.

- [x] **Step 2: Service** — `DashboardServiceImpl implements DashboardService`, `@Service @RequiredArgsConstructor`. Single method `Response<DashboardStatsDTO> getDashboardStats()`:
  - Totals: `problemRepository.count()`, `userRepository.count()`, `submissionRepository.count()`, `contestRepository.count()`, `organizationRepository.count()`.
  - Map `Object[]` rows from Task 1 queries into `NameCount` lists.
  - Users over time: fill missing months with 0, then compute running `cumulative` (seed with count of users created before the window: `userRepository.countByCreatedAtBefore(since)` — add this derived query).
  - Submissions over time: fill missing days with 0 for the last 30 days.
  - Top solvers: fetch top-10 `UserStatistics`, batch-load `User`s, map to `TopSolverDTO` preserving order.
  - Return `Response.<DashboardStatsDTO>builder().statusCode(200).message("success").data(dto).build()` (match existing `Response<T>` usage in other services).

- [x] **Step 3: Controller**

```java
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Response<DashboardStatsDTO>> getDashboardStats() { ... }
}
```

Mirror `AdminUserController.java` style (it uses the same `/api/admin/**` + `@PreAuthorize("hasAuthority('ADMIN')")` pattern). `/api/admin/**` is NOT in the public-endpoints list in `SecurityConfig`, so no SecurityConfig change is needed — verify this assumption while implementing.

- [x] **Step 4: Build check** — `cd TDTUOJ_backend && ./mvnw compile -q` must pass.

---

## Task 3: Frontend — ApiService method

**Files:**
- Modify: `tdtuoj_frontend/src/services/ApiService.js`

- [x] **Step 1:** Add next to the other admin methods (`getUserByUserIdAsAdmin`, ~line 150):

```js
static async getAdminDashboardStats() {
  const response = await axios.get(`${this.BASE_URL}/admin/dashboard`, {
    headers: this.getHeader(),
  });
  return response.data;
}
```

---

## Task 4: Frontend — AdminDashboardPage

**Files:**
- Create: `tdtuoj_frontend/src/components/admin/AdminDashboardPage.jsx`

- [x] **Step 1: Skeleton + data fetch** — `useEffect` → `ApiService.getAdminDashboardStats()`, store in one `stats` state, `loading` flag, toast on error. Page header styled like other admin pages (see `AdminProblemPage.jsx` header for class names).

- [x] **Step 2: Stat cards row** — 5 cards (Problems / Users / Submissions / Contests / Organizations) with lucide icons (`List`, `User`, `Send`, `Trophy`, `Building2`). Inline styles with theme CSS variables, consistent with sidebar/admin styling.

- [x] **Step 3: Difficulty donut** — copy structure of `LanguageDonutChart` (`ProfilePage.jsx:118-195`): `PieChart > Pie` with `innerRadius 56 / outerRadius 88 / paddingAngle 3 / cornerRadius 6`, center `Label` = total problems, custom tooltip like `PieTooltip` (`ProfilePage.jsx:93-116`). Colors: EASY `var(--success, #22c55e)`, MEDIUM amber, HARD red — match difficulty badge colors already used in problem tables.

- [x] **Step 4: Verdict donut** — copy `DonutChart` from `AdminContestMonitorPage.jsx:106-169` including the color-coded AC-rate center label and `VerdictLegend`/`VerdictTooltip` patterns. Extract or duplicate locally (duplication is acceptable; do NOT refactor AdminContestMonitorPage in this task).

- [x] **Step 5: Users-over-time + submissions-over-time charts** — copy `RatingChart` pattern (`ProfilePage.jsx:290-404`): `ComposedChart` with `Area` (gradient fill) + `Line`, `CartesianGrid`, themed axes, custom tooltip, `animationDuration 800`. Users chart plots `cumulative`; submissions chart plots daily `count`.

- [x] **Step 6: Problems-by-tag bars** — simple list rows: tag name, count, and a proportional bar div (`width: pct%`, background `var(--primary)`). No recharts needed unless a `BarChart` matches the style better.

- [x] **Step 7: Top solvers table** — reuse admin table markup/classes from `AdminUserPage.jsx` for visual consistency (per feat/admin-table-ui-consistency.md). Columns: #, User (avatar + username → `<Link to={`/users/${username}`}>`), Solved, AC Rate, Rating.

- [x] **Step 8: Layout** — CSS grid: stat cards full-width row; then 2-column grid (difficulty donut | verdict donut), (users line | submissions line), (tags | top solvers). Single column under ~900px.

---

## Task 5: Frontend — sidebar item + route

**Files:**
- Modify: `tdtuoj_frontend/src/components/admin/AdminSideBar.jsx`, `tdtuoj_frontend/src/App.jsx`

- [x] **Step 1: Sidebar** — In `AdminSideBar.jsx`, add a Dashboard entry rendered only when `ApiService.isAdmin()` (same conditional pattern as the Users item), placed BEFORE Problems. Icon: `LayoutDashboard` (already imported). Path: `/admin/dashboard`. NOTE: active-state check uses `location.pathname.startsWith(to)` — `/admin/dashboard` does not collide with other paths, no change needed.

- [x] **Step 2: Route** — In `App.jsx` inside the `/admin` block (lines ~82-99), add:

```jsx
<Route path="dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
```

(Mirrors the `users` route which wraps with `AdminRoute` inside the `AdminOrCreatorRoute` parent.)

- [x] **Step 3: Build check** — `cd tdtuoj_frontend && npm run build` must pass.

---

## Task 6: Verification

- [x] Backend: `./mvnw compile -q` passes; start backend, hit `GET /api/admin/dashboard` with an ADMIN token → 200 with populated payload; with a CREATOR/PARTICIPANT token → 403; unauthenticated → 401/403.
- [x] Frontend: `npm run build` passes; log in as admin → Dashboard appears first in sidebar → page renders all sections; log in as CREATOR → no Dashboard item in sidebar, direct navigation to `/admin/dashboard` redirects away.
- [x] Charts visually match ProfilePage/ContestMonitor style (same radii, animation, tooltips, theme variables) in both light/dark themes if applicable.
- [x] Empty-data resilience: fresh DB (0 submissions, 0 tags) renders without NaN/crash — guard divisions by zero in AC-rate and tag-percentage calculations.

---

## Risks / Open Points

- **JPQL field names**: queries above use guessed entity field names (`difficulty`, `submissionVerdict`, `submissionDate`, `createdAt`). Verify against actual entities before writing; adjust JPQL accordingly.
- **`FUNCTION('to_char', ...)`**: PostgreSQL-specific. Fine here (Postgres is the only target DB), but if it misbehaves with Hibernate 6, fall back to fetching raw timestamps and grouping in Java (data volumes are small).
- **Performance**: all queries are simple aggregates over modest tables; no caching needed initially. If needed later, add `@Cacheable` with a short TTL via the existing Redis setup.
- **Scope**: admin-only by design. If lecturers (CREATOR) later need a scoped dashboard (their own problems/labs), that is a separate feature.
