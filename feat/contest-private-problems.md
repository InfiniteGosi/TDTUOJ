# Contest Fairness — Private-Only Contest Problems + Auto-Publish on Contest End

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A contest may only contain **private problems with no prior solvers**. Admins/creators pick from their own private problem pool (the "My Problems" repository) when building a contest. The moment the contest ends, its problems are **automatically published** (`isPublic = true`) so everyone can practice them — mirroring how Codeforces moves round problems into the public archive after the round.

**Why:** Today `ContestServiceImpl.createContest/updateContest` attach any problem ID with **zero validation** (`ContestServiceImpl.java:124-137` and `:182-197`). The admin form's picker even lists the *public* problem set (`AdminContestFormPage.jsx:66` → `getAllProblems`). Anyone may have already solved those problems in practice mode → pre-knowledge → unfair contest.

**Architecture:** Three enforcement points + one automation:

1. **Server-side validation** (the real guard): on contest create/update, every *newly attached* problem must be (a) private, (b) authored by the caller (ADMIN bypasses ownership), (c) have **no submissions from anyone except its author** (author may test own problem). Problems already attached to the contest are skipped — they legitimately accumulate submissions while the contest runs.
2. **Eligible-problems endpoint + picker swap** (the UX): new `GET /api/problems/contest-eligible` returns exactly the problems that pass the validation; `ProblemPicker` in the admin contest form consumes it instead of the public list.
3. **Manual-publish guard**: while a problem is attached to a contest that hasn't ended, its owner cannot flip `isPublic = true` from My Problems (would leak the statement mid-/pre-contest).
4. **Auto-publish scheduler**: new `problemsPublished` flag on `Contest`; a 60-second scheduled job (same cadence as the existing `ContestRatingScheduler`) finds ended contests with the flag unset, publishes their problems, sets the flag. Works for rated *and* unrated contests, independent of rating processing.

**Tech Stack:** Spring Boot 3.5 / Spring Data JPA (derived + JPQL queries) / existing `@Scheduled` infrastructure / JUnit 5 + Mockito / React 19. No new dependencies. Schema change: one nullable boolean column on `contests`, applied by `ddl-auto: update`.

---

## Part 0 — Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| "No solver before" definition | **No submissions from any user other than the problem's author** (any verdict, not just AC) | Author must be able to test own problem; a non-author WA still proves statement exposure |
| Ownership rule | CREATOR may only attach problems they authored; **ADMIN may attach any eligible private problem** | Matches existing admin-bypass pattern (`ContestServiceImpl.updateContest:157`) |
| Validation scope on update | Only **newly added** problems validated; problems already attached are exempt | A running/ended contest's problems have contest submissions — naive re-validation would break every edit |
| Publish trigger | `endTime` passed — **not** `ratingProcessed` | Publishing the statement after end is harmless to ratings; unrated contests have no rating pass at all |
| Publish mechanism | New `problemsPublished` flag on `Contest` + scheduled job (60 s) | Same proven pattern as `ContestRatingScheduler`; idempotent; survives restarts |
| Problem reuse across contests | Implicitly forbidden | After contest #1 runs, the problem has non-author submissions → fails eligibility for contest #2; after end it's public → also fails |
| Existing contests (pre-feature rows) | `problems_published` column is NULL → treated as unpublished; scheduler will sweep old ended contests once and set `isPublic = true` on their problems | Old contests used public problems anyway — re-publishing is a no-op. Side effect: a private problem deliberately left in an old ended contest **will** get published. Acceptable per feature semantics; call out in release note |

**Known, accepted limitations** (document, don't fix here):
1. `GET /api/problems/{slug}` has no `isPublic` guard (`ProblemServiceImpl.java:119-127`) — anyone who *guesses* the slug can read a private statement. Slug = slugified title, and the title is hidden until contest start, so the window is small. Task 7 adds a minimal guard; a stricter "registered participants only" rule is left as future work.
2. Mid-contest problem **removal** is allowed (existing behavior, unchanged). Removing a problem doesn't republish anything.
3. If the author submits to their own problem *during* the contest as a registered participant, those rows count as author submissions and don't affect eligibility logic (problem is already attached → exempt anyway).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `TDTUOJ_backend/.../submission/repository/SubmissionRepository.java` | Modify | `existsByProblemIdAndUserIdNot` eligibility probe |
| `TDTUOJ_backend/.../problem/repository/ProblemRepository.java` | Modify | `findContestEligibleByAuthor` / `findContestEligibleAll` JPQL |
| `TDTUOJ_backend/.../contest/entity/Contest.java` | Modify | `problemsPublished` flag |
| `TDTUOJ_backend/.../contest/repository/ContestRepository.java` | Modify | `findEndedWithUnpublishedProblems` JPQL |
| `TDTUOJ_backend/.../contest/repository/ContestProblemRepository.java` | Modify | `existsActiveContestAttachment` JPQL |
| `TDTUOJ_backend/.../contest/service/ContestServiceImpl.java` | Modify | Attach-time validation in create/update |
| `TDTUOJ_backend/src/test/.../contest/service/ContestServiceImplTest.java` | Modify | Validation tests |
| `TDTUOJ_backend/.../contest/service/ContestProblemPublishService.java` | **Create** | Publish-on-end transactional service |
| `TDTUOJ_backend/src/test/.../contest/service/ContestProblemPublishServiceTest.java` | **Create** | Publish service tests |
| `TDTUOJ_backend/.../contest/service/ContestRatingScheduler.java` | Modify | Second scheduled hook calling the publish service |
| `TDTUOJ_backend/.../problem/service/ProblemServiceImpl.java` | Modify | Manual-publish guard; contest-eligible listing; slug-access guard |
| `TDTUOJ_backend/.../problem/controller/ProblemController.java` | Modify | `GET /api/problems/contest-eligible` |
| `tdtuoj_frontend/src/services/ApiService.js` | Modify | `getContestEligibleProblems()` |
| `tdtuoj_frontend/src/components/admin/AdminContestFormPage.jsx` | Modify | Picker swap + helper copy |

---

## Part 1 — Backend: queries & schema

### Task 1: Repository queries + `problemsPublished` flag

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java` (next to `existsByUserIdAndProblemId`, ~line 45)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/repository/ProblemRepository.java` (next to `findByAuthorId`, ~line 118)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/entity/Contest.java` (after `freezeDurationMinutes`)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestRepository.java` (next to `findUnprocessedRatedContests`, ~line 30)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestProblemRepository.java`

- [ ] **Step 1: Eligibility probe** — in `SubmissionRepository.java` add (derived query; `Submission.problem` is a `@ManyToOne`, so `ProblemId` resolves to `problem.id`):

```java
    /** True if anyone OTHER than the given user has submitted to this problem. */
    boolean existsByProblemIdAndUserIdNot(Long problemId, Long userId);
```

- [ ] **Step 2: Eligible-problem listings** — in `ProblemRepository.java` add:

```java
    /**
     * Contest-eligible problems for a CREATOR: private, authored by them,
     * and untouched by anyone else (author's own test submissions allowed).
     * Mirrors the validation in ContestServiceImpl — keep in sync.
     */
    @Query("SELECT p FROM Problem p WHERE p.author.id = :authorId AND p.isPublic = false " +
           "AND NOT EXISTS (SELECT s FROM Submission s WHERE s.problem.id = p.id AND s.userId <> :authorId) " +
           "AND LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Problem> findContestEligibleByAuthor(@Param("authorId") Long authorId,
                                              @Param("search") String search,
                                              Pageable pageable);

    /** Contest-eligible problems for an ADMIN: any private problem untouched by non-authors. */
    @Query("SELECT p FROM Problem p WHERE p.isPublic = false " +
           "AND NOT EXISTS (SELECT s FROM Submission s WHERE s.problem.id = p.id " +
           "                AND (p.author IS NULL OR s.userId <> p.author.id)) " +
           "AND LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Problem> findContestEligibleAll(@Param("search") String search, Pageable pageable);
```

- [ ] **Step 3: `problemsPublished` flag** — in `Contest.java`, after `freezeDurationMinutes`:

```java
    /**
     * Contest-fairness: set true once the post-contest job has flipped all
     * attached problems to isPublic = true. Null/false = not yet published.
     */
    @Builder.Default
    private Boolean problemsPublished = false;
```

- [ ] **Step 4: Publish-due query** — in `ContestRepository.java` (JPQL, not derived — must match NULL *and* false; pre-feature rows are NULL):

```java
    /** Ended contests whose problems haven't been auto-published yet. */
    @Query("SELECT c FROM Contest c WHERE c.endTime < :now " +
           "AND (c.problemsPublished IS NULL OR c.problemsPublished = false)")
    List<Contest> findEndedWithUnpublishedProblems(@Param("now") LocalDateTime now);
```

- [ ] **Step 5: Active-attachment probe** — in `ContestProblemRepository.java` (used by the manual-publish guard, Task 5):

```java
    /** True if the problem sits in any contest that hasn't ended yet. */
    @Query("SELECT COUNT(cp) > 0 FROM ContestProblem cp " +
           "WHERE cp.problem.id = :problemId AND cp.contest.endTime > :now")
    boolean existsActiveContestAttachment(@Param("problemId") Long problemId,
                                          @Param("now") LocalDateTime now);
```

- [ ] **Step 6: Compile** — `cd TDTUOJ_backend && ./mvnw compile -q` → BUILD SUCCESS. (`ddl-auto: update` adds `problems_published` at next boot.)

- [ ] **Step 7: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/submission/repository/SubmissionRepository.java TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/repository/ProblemRepository.java TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest
git commit -m "feat(contest): queries + problemsPublished flag for private-problem contests"
```

---

## Part 2 — Backend: attach-time validation (TDD)

### Task 2: Enforce private + unsolved + owned in `ContestServiceImpl`

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java` (create: problems loop at ~line 124-137; update: problems sync at ~line 182-197)
- Test: `TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestServiceImplTest.java`

- [ ] **Step 1: Write failing tests** — in `ContestServiceImplTest`, reuse the existing fixtures/mocks (`contestRepository`, `problemRepository`, `userService` are already mocked; add `submissionRepository` mock if absent). Cases:

```java
    // helper
    private Problem privateProblem(Long id, Long authorId) {
        User author = new User(); author.setId(authorId);
        return Problem.builder().id(id).isPublic(false).author(author).point(100).build();
    }

    @Test
    void createContest_publicProblem_rejected() {
        // problemRepository.findById → problem with isPublic=true
        // expect BadRequestException("…must be private…")
    }

    @Test
    void createContest_problemNotOwnedByCreator_rejected() {
        // caller = CREATOR id 1, problem author id 2 → BadRequestException
    }

    @Test
    void createContest_problemWithForeignSubmissions_rejected() {
        // submissionRepository.existsByProblemIdAndUserIdNot(pid, authorId) → true
        // expect BadRequestException("…already has submissions…")
    }

    @Test
    void createContest_adminAttachingOthersPrivateProblem_succeeds() {
        // caller = ADMIN, problem author id 2, no foreign submissions → OK
    }

    @Test
    void updateContest_existingAttachedProblem_skipsValidation() {
        // contest already contains problem 5 (now has contest submissions);
        // payload re-sends problem 5 → no eligibility check, no exception
    }

    @Test
    void updateContest_newlyAddedSolvedProblem_rejected() {
        // contest contains problem 5; payload adds problem 6 which has foreign submissions
        // → BadRequestException, and problem 5 untouched
    }
```

- [ ] **Step 2: Run to verify failures** — `./mvnw test -q -Dtest=ContestServiceImplTest` → new tests FAIL (no guard yet).

- [ ] **Step 3: Implement** — add the helper to `ContestServiceImpl`:

```java
    /**
     * Contest-fairness gate: a problem may enter a contest only if it is
     * private, authored by the caller (ADMIN bypasses ownership), and has
     * never been submitted to by anyone except its author.
     * Mirrors ProblemRepository.findContestEligible* — keep in sync.
     */
    private void validateProblemEligibleForContest(Problem problem, User caller) {
        boolean isAdmin = hasRole(caller, "ADMIN");
        Long authorId = problem.getAuthor() != null ? problem.getAuthor().getId() : null;

        if (!isAdmin && (authorId == null || !authorId.equals(caller.getId()))) {
            throw new BadRequestException(
                "You can only add problems you authored: '" + problem.getTitle() + "'");
        }
        if (Boolean.TRUE.equals(problem.getIsPublic())) {
            throw new BadRequestException(
                "Contest problems must be private: '" + problem.getTitle()
                + "'. Public problems may already have solvers.");
        }
        if (submissionRepository.existsByProblemIdAndUserIdNot(
                problem.getId(), authorId != null ? authorId : -1L)) {
            throw new BadRequestException(
                "Problem '" + problem.getTitle() + "' already has submissions from other users "
                + "and cannot be used in a contest.");
        }
    }
```

  Wire it in:
  - **`createContest`** (problems loop, ~line 126-137): after `problemRepository.findById(...)`, call `validateProblemEligibleForContest(problem, creator);` (the `creator` variable already exists at line 105).
  - **`updateContest`** (problems sync, ~line 183-197): *before* `contest.getContestProblems().clear()`, snapshot the currently attached IDs:

```java
        Set<Long> alreadyAttached = contest.getContestProblems().stream()
                .map(cp -> cp.getProblem().getId())
                .collect(Collectors.toSet());
```

  then inside the rebuild loop, validate only newcomers:

```java
        if (!alreadyAttached.contains(problem.getId())) {
            validateProblemEligibleForContest(problem, currentUser);
        }
```

  Inject `SubmissionRepository` into `ContestServiceImpl` if not already a field (constructor injection via Lombok `@RequiredArgsConstructor` — just add the field).

- [ ] **Step 4: Run tests** — `./mvnw test -q -Dtest=ContestServiceImplTest` → ALL PASS. Pre-existing create/update tests that used public problem fixtures must be updated to private-authored fixtures (expected churn — fix the fixtures, not the assertions).

- [ ] **Step 5: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestServiceImplTest.java
git commit -m "feat(contest): enforce private unsolved owned problems on contest create/update"
```

---

## Part 3 — Backend: auto-publish on contest end (TDD)

### Task 3: `ContestProblemPublishService`

**Files:**
- Create: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestProblemPublishService.java`
- Test: `TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestProblemPublishServiceTest.java`

- [ ] **Step 1: Write failing tests** — cases:
  - ended contest, flag false, 2 private problems → both flipped to `isPublic=true`, problems saved, contest flag set true, contest saved;
  - ended contest with an already-public problem (pre-feature data) → no exception, flag still set (idempotent);
  - publish of one contest throwing → other contests still processed (exception isolated per contest);
  - no due contests → no repository writes.

- [ ] **Step 2: Implement:**

```java
package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Contest-fairness: once a contest ends, its (private) problems become part of
 * the public practice archive. Idempotent — guarded by Contest.problemsPublished.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContestProblemPublishService {

    private final ContestRepository contestRepository;
    private final ProblemRepository problemRepository;

    /** Called by the scheduler. Each contest handled in its own transaction. */
    public void publishDueContests() {
        List<Contest> due = contestRepository.findEndedWithUnpublishedProblems(LocalDateTime.now());
        for (Contest contest : due) {
            try {
                publishContestProblems(contest);
            } catch (Exception e) {
                log.error("Failed to publish problems for contest id={}", contest.getId(), e);
            }
        }
    }

    @Transactional
    public void publishContestProblems(Contest contest) {
        int published = 0;
        for (var cp : contest.getContestProblems()) {
            Problem p = cp.getProblem();
            if (p != null && !Boolean.TRUE.equals(p.getIsPublic())) {
                p.setIsPublic(true);
                problemRepository.save(p);
                published++;
            }
        }
        contest.setProblemsPublished(true);
        contestRepository.save(contest);
        log.info("Auto-published {} problem(s) for ended contest '{}' (id={})",
                published, contest.getName(), contest.getId());
    }
}
```

> ⚠ Self-invocation: `publishDueContests()` calling `publishContestProblems()` on `this` bypasses the `@Transactional` proxy. Either make the scheduler call `publishContestProblems` per contest, or (simpler) annotate `publishDueContests` itself `@Transactional` and accept one transaction for the batch. Note the existing codebase precedent: `ContestLeaderboardService` uses a separate `cacheHelper` bean for exactly this reason — follow whichever pattern the implementer prefers, but **don't leave a silent non-transactional path**.

- [ ] **Step 3: Hook into the scheduler** — in `ContestRatingScheduler.java` (already `@Scheduled(fixedDelay = 60000)` at ~line 36), inject `ContestProblemPublishService` and add a second scheduled method:

```java
    /** Publish problems of ended contests (rated AND unrated) — every 60 s. */
    @Scheduled(fixedDelay = 60_000, initialDelay = 20_000)
    public void publishEndedContestProblems() {
        publishService.publishDueContests();
    }
```

- [ ] **Step 4: Run tests** — `./mvnw test -q -Dtest=ContestProblemPublishServiceTest` → ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service TDTUOJ_backend/src/test/java/com/oj/TDTUOJ/contest/service/ContestProblemPublishServiceTest.java
git commit -m "feat(contest): auto-publish contest problems when contest ends"
```

---

## Part 4 — Backend: problem-side guards + eligible endpoint

### Task 4: `GET /api/problems/contest-eligible`

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/service/ProblemServiceImpl.java` (next to `getMyProblems`, ~line 463)
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/controller/ProblemController.java` (next to `/my`, ~line 46)
- Modify: service interface `ProblemService`

- [ ] **Step 1: Service method:**

```java
    @Override
    public Response<Page<ProblemDTO>> getContestEligibleProblems(int page, int size, String search) {
        User currentUser = userService.getCurrentLoggedInUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        boolean isAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        Page<Problem> problems = isAdmin
                ? problemRepository.findContestEligibleAll(search, pageable)
                : problemRepository.findContestEligibleByAuthor(currentUser.getId(), search, pageable);
        // map to DTO exactly like getMyProblems does
        ...
    }
```

- [ ] **Step 2: Controller endpoint:**

```java
    /** Problems usable in a contest: private + zero non-author submissions. */
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    @GetMapping("/contest-eligible")
    public ResponseEntity<Response<Page<ProblemDTO>>> getContestEligibleProblems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "") String search) {
        return ResponseEntity.ok(problemService.getContestEligibleProblems(page, size, search));
    }
```

> `SecurityConfig` note: `/api/problems/**` is in the public allowlist, but `@PreAuthorize` still guards this method — verify a 401/403 is returned for anonymous/participant callers during the smoke test.

- [ ] **Step 3: Compile + commit**

```bash
cd TDTUOJ_backend && ./mvnw compile -q
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem
git commit -m "feat(problem): contest-eligible problem listing endpoint"
```

---

### Task 5: Manual-publish guard in `updateProblem`

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/service/ProblemServiceImpl.java` (~line 373, the `setIsPublic` branch)

- [ ] **Step 1: Guard** — where `updateProblem` applies `problemDTO.getIsPublic()`, block publishing while the problem sits in a non-ended contest (inject `ContestProblemRepository`):

```java
        if (problemDTO.getIsPublic() != null) {
            if (Boolean.TRUE.equals(problemDTO.getIsPublic())
                    && !Boolean.TRUE.equals(problem.getIsPublic())
                    && contestProblemRepository.existsActiveContestAttachment(
                            problem.getId(), LocalDateTime.now())) {
                throw new BadRequestException(
                    "This problem is part of an upcoming or running contest and cannot be "
                    + "published until the contest ends (it will be published automatically).");
            }
            problem.setIsPublic(problemDTO.getIsPublic());
        }
```

  Frontend needs no change — `MyProblemsPage.handleTogglePublic` already surfaces backend error messages via toast.

- [ ] **Step 2: Compile + commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/service/ProblemServiceImpl.java
git commit -m "feat(problem): block manual publish while problem is in an active contest"
```

---

### Task 6 (hardening, small): slug-access guard for private problems

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem/service/ProblemServiceImpl.java:119-127` (`getProblemBySlug`)

- [ ] **Step 1:** `getProblemBySlug` currently returns ANY problem. For a private problem, allow only: author, ADMIN/CREATOR, **or** the problem is attached to a contest that has already started (participants need the statement mid-contest; after end it's public anyway). Otherwise 404 (`NotFoundException` — don't confirm existence). New repo probe in `ContestProblemRepository`:

```java
    @Query("SELECT COUNT(cp) > 0 FROM ContestProblem cp " +
           "WHERE cp.problem.id = :problemId AND cp.contest.startTime <= :now")
    boolean existsStartedContestAttachment(@Param("problemId") Long problemId,
                                           @Param("now") LocalDateTime now);
```

  Guard sketch (resolve viewer leniently — endpoint is public):

```java
        if (!Boolean.TRUE.equals(problem.getIsPublic())
                && !contestProblemRepository.existsStartedContestAttachment(problem.getId(), LocalDateTime.now())
                && !isAuthorOrStaff(problem)) {   // try/catch anonymous → false
            throw new NotFoundException("Problem not found");
        }
```

- [ ] **Step 2:** Check `ContestProblemPage.jsx` + `ProblemDetailsPage.jsx` flows still work: contest participant opens `/contests/{c}/problems/{p}` mid-contest → contest started → guard passes. Run existing `ProblemService` tests; add 2 unit tests (anonymous + private + unstarted → 404; mid-contest → 200).

- [ ] **Step 3: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/problem TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestProblemRepository.java
git commit -m "feat(privacy): hide private problem statements outside started contests"
```

---

## Part 5 — Frontend

### Task 7: Picker swap in `AdminContestFormPage`

**Files:**
- Modify: `tdtuoj_frontend/src/services/ApiService.js` (next to `getMyProblems`, ~line 739)
- Modify: `tdtuoj_frontend/src/components/admin/AdminContestFormPage.jsx` (`ProblemPicker`, lines 60-170; fetch at line 66)

- [ ] **Step 1: ApiService method:**

```js
  static async getContestEligibleProblems({ page = 0, size = 100, search = "" } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/problems/contest-eligible`, {
      params: { page, size, search },
      headers: this.getHeader(),
    });
    return resp.data;
  }
```

- [ ] **Step 2: Swap the picker source** — in `ProblemPicker` (line 66) replace `ApiService.getAllProblems({ limit: 200, offset: 0 })` with `ApiService.getContestEligibleProblems({ size: 200 })`. Adjust the response unwrapping: `/contest-eligible` returns a Spring `Page` (`data.content`), whereas `getAllProblems` returned a list — map accordingly.

- [ ] **Step 3: Copy changes** — in the picker dropdown header/empty state:
  - empty state: *"No eligible problems. Create a **private** problem in My Problems first — contest problems must be private and unsolved."*
  - helper line under the PROBLEMS section title: *"Only your private, never-submitted problems can be added. They are published to the public archive automatically when the contest ends."*

- [ ] **Step 4: Build** — `cd tdtuoj_frontend && npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add tdtuoj_frontend/src/services/ApiService.js tdtuoj_frontend/src/components/admin/AdminContestFormPage.jssx
git commit -m "feat(admin): contest form picks from private contest-eligible problems"
```

(typo guard: file is `.jsx`)

---

## Part 6 — Verification

### Task 8: Full build + tests + manual walkthrough

- [ ] **Step 1:** `cd TDTUOJ_backend && ./mvnw test -q` → BUILD SUCCESS, zero failures.
- [ ] **Step 2:** `cd tdtuoj_frontend && npm run build` → succeeds.
- [ ] **Step 3:** Boot smoke test — `./mvnw spring-boot:run`; verify `problems_published` column added:

```sql
SELECT id, name, problems_published FROM contests ORDER BY id DESC LIMIT 5;
```

  ⚠ First boot also makes the scheduler sweep **all previously ended contests** — expect a burst of `Auto-published N problem(s)` log lines once. Verify no private problem you care about gets unintentionally published (see Part 0 decision table).

- [ ] **Step 4: Manual scenario (~12 min):**
  1. **creator1**: My Problems → create problem `Secret A` (private, has test cases). Submit own test solution → still eligible.
  2. **participant**: submit to a *different* private problem `Secret B` of creator1 (via direct slug, pre-Task-6 behavior) — `Secret B` becomes ineligible.
  3. **creator1** → Create Contest: picker lists `Secret A` but **not** `Secret B`, and no public problems. Attach `Secret A`, start = now−1 min, end = now+5 min.
  4. API bypass check: `POST /api/contests` with a public problem ID via curl/Invoke-RestMethod → 400 "must be private".
  5. **creator1** → My Problems → try toggling `Secret A` public → toast error "part of an upcoming or running contest".
  6. **participant** registers, solves `Secret A` mid-contest (works — attached problem exempt from checks).
  7. Mid-contest edit: creator re-saves contest (problem list unchanged) → saves fine despite `Secret A` now having foreign submissions (already-attached exemption).
  8. Wait for end + ≤60 s → backend log `Auto-published 1 problem(s)`; `/problems` public list now shows `Secret A`; DB: `problems_published = true`.
  9. Reuse check: create second contest → picker no longer lists `Secret A` (public now).

- [ ] **Step 5: Report results honestly**, including test output.

---

## Execution order & dependencies

```
Task 1 (queries + flag) ──▶ Task 2 (attach validation) ──▶ Task 8 (verify)
            │
            ├──▶ Task 3 (publish service + scheduler)
            ├──▶ Task 4 (eligible endpoint) ──▶ Task 7 (frontend picker)
            ├──▶ Task 5 (manual-publish guard)
            └──▶ Task 6 (slug guard — independent, can go last)
```

Tasks 2-6 are independent of each other after Task 1; Task 7 needs Task 4; Task 8 last.

---

# Extension: Labs + Usage Badges (IMPLEMENTED)

Same fairness model extended to organization labs, plus visibility into where each problem is used. Implemented alongside the contest feature — documented here for reference and manual verification.

## Part 7 — Design: labs vs contests

Labs are homework, not competitions, so the rules differ deliberately:

| Rule | Contest | Lab |
|---|---|---|
| Problem must be **private** | ✔ | ✔ |
| Problem must be **authored by caller** (platform ADMIN bypasses) | ✔ | ✔ |
| Problem must have **zero non-author submissions** | ✔ — pre-knowledge breaks competition | ✘ — homework; reuse across labs/semesters is fine |
| **Auto-publish** when it ends | ✔ — at `endTime`, ≤60 s scheduler lag | ✘ — lab problems stay private forever (until owner publishes manually) |
| Already-attached problems exempt from re-validation on edit | ✔ | ✔ |

### 7.1 Who can see a private problem's statement (`GET /api/problems/{slug}`)

One guard in `ProblemServiceImpl.getProblemBySlug`, four ways in. Otherwise **404** (not 403 — existence not confirmed):

1. **Author** of the problem
2. **Platform staff** — ADMIN or CREATOR role
3. Problem attached to a **contest that has started** (participants need it mid-contest; it auto-publishes at end anyway)
4. Problem attached to **any lab** (org students need it; labs never publish)

### 7.2 Eligibility matrix — when can a problem enter a contest or lab?

| Problem state | Contest picker / API | Lab picker / API |
|---|---|---|
| Private, yours, never submitted to by others | ✔ eligible | ✔ eligible |
| Private, yours, **author's own** test submissions only | ✔ eligible (own submissions don't count) | ✔ eligible |
| Private, yours, has submissions from **other users** (e.g. lab students, or anyone who had the slug) | ✘ contest-ineligible — pre-knowledge | ✔ still lab-eligible |
| Private, **someone else's** | ✘ unless you are platform ADMIN | ✘ unless you are platform ADMIN |
| **Public** (practice archive) | ✘ always | ✘ always |
| Was in an **ended contest** | ✘ — it auto-published, so it's public now | ✘ — public |
| Currently in a **running/upcoming contest** | ✘ for a *second* contest once anyone submits (foreign submissions); also already attached to the first | ✘ once contest participants submitted |

Consequences worth understanding:

- **One private problem serves labs OR one contest — order matters.** Contest first → fine (it publishes after, then it's practice material). Lab first → student submissions make it contest-ineligible **permanently**. The lab form warns about this.
- **Reuse across labs is unrestricted** — same private problem in lab A this semester, lab B next semester.
- **Enforcement is server-side** in `ContestServiceImpl.validateProblemEligibleForContest` and `LabServiceImpl.validateProblemEligibleForLab`; the pickers are UX sugar. POSTing raw problem IDs gets a 400.

### 7.3 Usage badges in My Problems

The Visibility column of `/admin/my-problems` now shows up to three chips per problem, derived live from the attachment tables (`contest_problems`, `lab_exercises`) — no stored "purpose" field, so they can't drift:

| Badge | Meaning | What you can still do with it |
|---|---|---|
| `Public` (green) | In the public practice archive | Nothing contest/lab — public problems are never eligible |
| `Private` (amber), **no other badge** | Free agent | Add to a contest or a lab |
| `Private` + `CONTEST` (cyan, trophy) | Attached to a contest | Don't touch — publishes automatically when the contest ends; manual publish toggle is **blocked** while the contest is upcoming/running |
| `Private` + `LAB` (blue, flask) | Lab exercise | Reusable in more labs; **don't plan a contest around it** once students submit |
| `Public` + `CONTEST` | Contest ended, auto-publish ran | It's practice material now; badge shows its history |

Backed by `ProblemDTO.usedInContest` / `usedInLab`, populated only on the `GET /api/problems/my` listing.

## Part 8 — Manual verification walkthrough: labs + badges (~10 min)

Prereqs: backend + frontend running; **creator1** (CREATOR, owner of an organization `Test Org`), **student1** (PARTICIPANT, member of `Test Org`).

### 8.1 Lab eligibility rules

- [ ] **creator1** → My Problems → create two problems: `Lab Secret` (**private**) and `Lab Public` (**public**), both with test cases.
- [ ] **creator1** → `Test Org` → create lab → search `Lab Secret`. **Expected:** appears in results.
- [ ] Search `Lab Public`. **Expected:** **absent** (picker filters `isPublic === false`); hint text above search explains private-only rule.
- [ ] API bypass check — add a public problem by raw ID:

```powershell
# expect 400 "Lab problems must be private: 'Lab Public'"
Invoke-RestMethod -Method Post "http://localhost:8090/api/organizations/<orgId>/labs" `
  -Headers @{Authorization="Bearer $creatorToken"; "Content-Type"="application/json"} `
  -Body '{"title":"Bypass Lab","exercises":[{"problemId":<labPublicId>,"points":100}]}'
```

- [ ] Ownership check: as a **different** org-owner creator, try attaching creator1's `Lab Secret` by ID. **Expected:** 400 "You can only add problems you authored".
- [ ] Save the lab with `Lab Secret` normally. **Expected:** created.

### 8.2 Student access to private lab problems

- [ ] **student1** → `Test Org` → open the lab → click `Lab Secret`. **Expected:** statement loads (lab attachment opens the slug guard) and submitting works.
- [ ] **Incognito** (logged out) → open the same problem URL directly. **Expected:** statement loads too — lab attachment is the visibility key, not membership. *(Documented behavior: pre-feature these problems were fully public; stricter members-only check is future work.)*
- [ ] A private problem in **no** lab/contest, opened logged-out by slug. **Expected:** 404.

### 8.3 Labs never publish

- [ ] Set the lab's deadline to 2 minutes from now. Wait past it (+ ≥60 s scheduler cycle).
- [ ] **Expected:** `Lab Secret` still **Private** in My Problems; absent from the public `/problems` list; no `Auto-published` log line for it. (Publisher scans `contests` only — labs have no row there.)

### 8.4 Lab → contest cross-contamination (the footgun, on purpose)

- [ ] **student1** submits to `Lab Secret` in the lab (any verdict).
- [ ] **creator1** → Create Contest → picker search `Lab Secret`. **Expected:** **absent** — student submission made it contest-ineligible.
- [ ] API check:

```powershell
# expect: Lab Secret NOT in the list
Invoke-RestMethod "http://localhost:8090/api/problems/contest-eligible?search=Lab Secret" `
  -Headers @{Authorization="Bearer $creatorToken"}
```

- [ ] Reverse order works: a fresh private problem used in a **contest** first auto-publishes at contest end and is then ordinary practice material (already covered in 6.x walkthrough).

### 8.5 Usage badges

- [ ] **creator1** → My Problems. Verify the Visibility column:
  - `Lab Secret` → `Private` + **`LAB`** badge (blue flask). Hover tooltip: "stays private, not eligible for contests".
  - A problem attached to the contest from walkthrough 6.x, pre-end → `Private` + **`CONTEST`** badge (cyan trophy).
  - Same problem after contest end → `Public` + `CONTEST`.
  - A private problem in nothing → `Private` only (free agent).
- [ ] Toggle-publish guard interplay:
  - `Private` + `CONTEST` (contest not ended) → publish toggle → **Expected:** toast error "part of an upcoming or running contest".
  - `Private` + `LAB` → publish toggle → **Expected:** succeeds (labs don't block manual publish); lab keeps working since the problem is now public; lab **edit** still saves (already-attached exemption).

### 8.6 Lab edit exemption

- [ ] Edit the lab containing `Lab Secret` (rename it, keep exercises). **Expected:** saves fine even though `Lab Secret` now has student submissions — already-attached problems skip re-validation. Adding a *new* public problem in the same edit still fails with 400.
