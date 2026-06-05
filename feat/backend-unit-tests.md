# Backend Unit Tests Plan — Sonnet Runbook

> **Executor**: Claude Sonnet (one batch per session if needed)
> **Repo root**: `D:\OJ\TDTUOJ_backend`
> **Goal**: defense-ready unit-test suite + JaCoCo report. Springdoc annotation work is split into a separate appendix (Section 10) — do NOT mix with test batches.

---

## 0. Ground rules for Sonnet

1. **Read before write.** Before writing any `*Test.java`, read the SUT (`*Impl.java` / target class) end-to-end. Do not infer behavior from this plan — the plan is a map, the code is the truth.
2. **One batch at a time.** A batch = one Phase sub-step (e.g., "Phase 1.1 JaCoCo plugin", "Phase 2.1 SubmissionServiceImplTest"). Finish + verify a batch before starting the next. Do not chain batches in one go.
3. **Verify gate after every batch.** Always run:
   ```bash
   cd D:/OJ/TDTUOJ_backend
   ./mvnw -q -DskipTests compile
   ./mvnw -q test -Dtest=<NewTestClass>
   ```
   If red, fix before moving on. No "TODO later".
4. **No new infra.** No `@SpringBootTest`, no `@DataJpaTest`, no `@WebMvcTest`, no Testcontainers, no real Judge0 / Postgres / Redis / Gemini. Mockito only.
5. **Pattern source of truth**: `src/test/java/com/oj/TDTUOJ/user/service/UserServiceImplTest.java`. Copy its imports + assertion style.
6. **Naming**: `methodName_Scenario_ExpectedResult`. Use `// given / // when / // then` blocks.
7. **Assert three things per happy-path test**: (a) `response.getStatusCode()`, (b) payload `data` shape, (c) at least one `verify(...)` on a collaborator.
8. **No premature abstraction.** Do not extract base test classes / fixture factories until the same builder is duplicated in ≥3 files.
9. **Skip a method if its SUT logic is trivial getter/setter or pure ModelMapper passthrough.** Quality > raw count.

---

## 1. Tooling Setup (Phase 1)

### 1.1 Add JaCoCo plugin

File: `D:/OJ/TDTUOJ_backend/pom.xml`. Insert inside `<build><plugins>` (after `spring-boot-maven-plugin`):

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
    <configuration>
        <excludes>
            <exclude>com/oj/TDTUOJ/**/dto/**</exclude>
            <exclude>com/oj/TDTUOJ/**/entity/**</exclude>
            <exclude>com/oj/TDTUOJ/**/config/**</exclude>
            <exclude>com/oj/TDTUOJ/common/config/**</exclude>
            <exclude>com/oj/TDTUOJ/TdtuojApplication.class</exclude>
        </excludes>
    </configuration>
</plugin>
```

### 1.2 Verify

```bash
cd D:/OJ/TDTUOJ_backend
./mvnw -q test -Dtest=UserServiceImplTest
./mvnw -q verify
```
Expected: existing `UserServiceImplTest` green, `target/site/jacoco/index.html` exists. Record baseline % in commit message.

### 1.3 Commit

`test: add JaCoCo plugin for coverage report`

---

## 2. Target inventory (verified against current code)

These class names were re-checked against `src/main/java`. Use exactly these paths — earlier draft had drift.

| Pri | SUT class (full path under `src/main/java/com/oj/TDTUOJ`)                            | Test file to create (under `src/test/java/com/oj/TDTUOJ`)             |
|----:|--------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| P0  | `user/service/UserServiceImpl.java` (test exists — **extend**)                       | `user/service/UserServiceImplTest.java` (extend)                      |
| P0  | `user/service/AuthServiceImpl.java`                                                  | `user/service/AuthServiceImplTest.java`                               |
| P0  | `submission/service/SubmissionServiceImpl.java`                                      | `submission/service/SubmissionServiceImplTest.java`                   |
| P0  | `submission/service/SubmissionQueueService.java`                                     | `submission/service/SubmissionQueueServiceTest.java`                  |
| P0  | `submission/service/SubmissionJudgeService.java`                                     | `submission/service/SubmissionJudgeServiceTest.java`                  |
| P0  | `submission/worker/SubmissionWorker.java`                                            | `submission/worker/SubmissionWorkerTest.java`                         |
| P0  | `contest/service/ContestServiceImpl.java`                                            | `contest/service/ContestServiceImplTest.java`                         |
| P0  | `contest/service/ContestRatingService.java`                                          | `contest/service/ContestRatingServiceTest.java`                       |
| P0  | `contest/service/ContestLeaderboardService.java`                                     | `contest/service/ContestLeaderboardServiceTest.java`                  |
| P0  | `problem/service/ProblemServiceImpl.java`                                            | `problem/service/ProblemServiceImplTest.java`                         |
| P1  | `common/security/JwtUtils.java`                                                      | `common/security/JwtUtilsTest.java`                                   |
| P1  | `organization/service/OrganizationServiceImpl.java`                                  | `organization/service/OrganizationServiceImplTest.java`               |
| P1  | `testcase/service/TestCaseServiceImpl.java`                                          | `testcase/service/TestCaseServiceImplTest.java`                       |
| P2  | `problemAI/service/GeminiProblemAIService.java`                                      | `problemAI/service/GeminiProblemAIServiceTest.java`                   |
| P2  | `hintLLM/Service/GeminiHintService.java` (test one provider, skip the others)        | `hintLLM/Service/GeminiHintServiceTest.java`                          |
| P2  | `userStatistics/service/*ServiceImpl.java` (list at start of batch)                  | mirror under `userStatistics/service/`                                |

Notes vs earlier draft:
- `submission` has **three** services (Impl + Queue + Judge) — earlier draft missed two.
- `contest` has `ContestLeaderboardService` (separate from Impl) — earlier draft missed it.
- `user` has `AuthServiceImpl` separate from `UserServiceImpl` — earlier draft folded login/register into UserServiceImplTest, but those live in `AuthServiceImpl`.
- `hintLLM` has 3 providers (`ClaudeHintService`, `GeminiHintService`, `OpenAiHintService`). Test **one** (Gemini, it's the in-use default per CLAUDE.md). Mark the other two as "covered by interface contract" in commit notes.

---

## 3. Per-batch instruction template

Each batch in Section 4 is a self-contained task for Sonnet. Use this template mentally before writing code:

```
Batch X: <TestClassName>
1. Read SUT: src/main/java/.../<Class>.java end-to-end.
2. List every public method. For each, note: collaborators called, branches (if/else/throw), Response.statusCode returned.
3. From that list, pick 5–10 test cases: ~60% happy path, ~40% failure / branch.
4. Identify @Mock list = ctor-injected fields of the SUT (RequiredArgsConstructor → look at private final fields).
5. Write the test file. Mirror UserServiceImplTest.java style. Lombok is on; use entity setters/builders.
6. Run: ./mvnw -q test -Dtest=<TestClassName>
7. If red: fix. If green: commit `test(<module>): add <TestClassName>`.
```

Per-batch test count target: **5–10**. Cap line count per file at ~400. If a SUT is too big, split into `XxxCreateTest` / `XxxQueryTest`.

---

## 4. Phased execution

Each item below is one batch. Tick off only after the verify gate passes.

### Phase 2 — P0 (must-have, defense floor)

- [ ] **2.1** Extend `UserServiceImplTest` — add: `changePassword_Success`, `changePassword_WrongOldPassword_ThrowsBadRequest`, `updateProfile_Success`, `updateProfile_UsernameTaken_Throws`, `getAllUsers_PaginationMetaPopulated`.
- [ ] **2.2** `AuthServiceImplTest` — `register_Success`, `register_DuplicateEmail_ThrowsBadRequest`, `register_DuplicateUsername_Throws`, `login_Success`, `login_WrongPassword_ThrowsUnauthorized`, `login_UnknownUser_ThrowsNotFound`.
- [ ] **2.3** `SubmissionServiceImplTest` — `createSubmission_Success_EnqueuesAndReturnsPending`, `createSubmission_OnCooldown_Returns429`, `createSubmission_ProblemMissing_ThrowsNotFound`, `createSubmission_ContestWithoutRegistration_Returns403`, `createSubmission_AdminBypassesContestRegistration_Success`, `getMySubmissions_PaginationOK`, `getSubmissionStatistics_GroupsByVerdict`.
- [ ] **2.4** `SubmissionQueueServiceTest` — `isOnCooldown` true within window / false after. `getCooldownSeconds` returns configured value. Enqueue advances Redis key (mock the redis ops).
- [ ] **2.5** `SubmissionJudgeServiceTest` — feed a `SubmissionJobDTO`, mock `Judge0Client`/`WebClient`, assert verdict + status updates persisted via `submissionRepository`. Cover AC, WA, TLE, CE branches.
- [ ] **2.6** `SubmissionWorkerTest` — mock the queue + judge service, assert worker pulls and delegates; assert worker swallows-and-logs on judge exception (does not crash loop).
- [ ] **2.7** `ContestServiceImplTest` — `createContest_GeneratesSlug`, `createContest_DuplicateSlug_Disambiguated`, `registerForContest_Success`, `registerForContest_AlreadyRegistered_Returns400`, `registerForContest_ContestEnded_Returns400`, `getContestMonitor_PopulatesStartEndTime` (regression for 2026-05-23 fix), `updateContest_NotOwner_Returns403`, `deleteContest_OwnerOnly`.
- [ ] **2.8** `ContestRatingServiceTest` — `processRatings_AppliesEloAndPersistsHistory` (golden values), `processRatings_SkipsUnrated`, `processRatings_Idempotent_DoesNotDoubleApply`, `rebuildChainFrom_RespectsEndTimeAsc` (regression check from 2026-05-23 history work).
- [ ] **2.9** `ContestLeaderboardServiceTest` — ICPC scoring branch (penalty math on retries), IOI scoring branch (best-per-problem), tiebreaker order, cache hit vs miss path (mock `LeaderboardCacheHelper`).
- [ ] **2.10** `ProblemServiceImplTest` — `createProblem_GeneratesSlug`, `createProblem_DuplicateTitle_SlugSuffixed`, `getPublicProblems_FiltersByIsPublic`, `updateProblem_NotCreator_Throws403`, `deleteProblem_RemovesAndCascadesViaRepo` (verify on repo mock), `getProblemBySlug_NotFound_Throws404`.

After Phase 2, run `./mvnw -q verify` and capture JaCoCo % for the `*.service` packages of `user`, `submission`, `contest`, `problem`. Target ≥ 70% per P0 module.

### Phase 3 — P1 (high value if time permits)

- [ ] **3.1** `JwtUtilsTest` — `generateToken_ContainsExpectedClaims`, `validateToken_Valid_ReturnsTrue`, `validateToken_Expired_ReturnsFalse`, `validateToken_BadSignature_ReturnsFalse`, `extractUsername_ReturnsSubject`. Inject a fixed test secret via reflection (`ReflectionTestUtils.setField`).
- [ ] **3.2** `OrganizationServiceImplTest` — `invite_OwnerCan_Success`, `invite_MemberCannot_Returns403`, `acceptInvitation_FlipsStatus`, `acceptInvitation_AlreadyAccepted_Returns400`, `removeMember_OwnerSelf_Returns400`, `removeMember_ByAdmin_Success`.
- [ ] **3.3** `TestCaseServiceImplTest` — `create_BindToExistingProblem_Success`, `create_MissingProblem_Throws404`, `bulkImport_PreservesOrder`, `delete_ByCreatorOrAdmin_Success`, `delete_ByOther_Returns403`.

### Phase 4 — P2 (nice-to-have)

- [ ] **4.1** `GeminiProblemAIServiceTest` — mock `WebClient` chain (`.post().uri(...).bodyValue(...).retrieve().bodyToMono(...)` → `Mono.just(<json>)`). Cases: `extractFromPdf_HappyPath_ParsesJson`, `extractFromPdf_TruncatedJson_HandledGracefully` (regression 2026-05-23), `generateTestCases_RespectsPayloadCap`, `webClient5xx_ThrowsBadRequest`.
  - Reusable helper for WebClient mocking is allowed *here* (the chain is verbose); place in `problemAI/service/_WebClientMocks.java` only after both AI tests need it.
- [ ] **4.2** `GeminiHintServiceTest` — `hint_InScope_ReturnsHint`, `hint_OffTopic_RejectedByGuard`, `hint_Provider5xx_FallsBackOrThrows` (match actual behavior — read the code first).
- [ ] **4.3** `UserStatisticsServiceTest` family — list services in `userStatistics/service/` at the start of this batch (do not assume from this plan). Cover: `getRatingHistory_OrdersByContestEndTimeAsc` (regression), solved-count by difficulty, language-stats aggregation.

### Phase 5 — Defense artifacts

- [ ] **5.1** `./mvnw -q verify` → screenshot `target/site/jacoco/index.html` overview + one drilled-in package.
- [ ] **5.2** Pick 2 test files to walk through live during defense: recommend `ContestRatingServiceTest` (math) + `SubmissionServiceImplTest` (guard branches).
- [ ] **5.3** Add to thesis chapter: test-count, coverage %, list of regression tests tied to dated fixes (2026-05-23 contest monitor, 2026-05-23 Gemini truncated JSON, 2026-05-23 rating chain order).

---

## 5. Mock cookbook (copy-paste references)

### 5.1 Standard SUT-with-RequiredArgsConstructor

```java
@ExtendWith(MockitoExtension.class)
class FooServiceImplTest {
    @Mock private FooRepository fooRepository;
    @Mock private ModelMapper modelMapper;
    // ... one @Mock per `private final` field of FooServiceImpl

    @InjectMocks private FooServiceImpl fooService;
}
```

### 5.2 Response<T> assertions

```java
Response<FooDTO> resp = fooService.create(dto);
assertEquals(HttpStatus.CREATED.value(), resp.getStatusCode());
assertEquals("Foo created", resp.getMessage());
assertEquals(expectedDto, resp.getData());
verify(fooRepository).save(any(Foo.class));
```

### 5.3 WebClient mock (Mono path)

```java
@Mock private WebClient webClient;
@Mock private WebClient.RequestBodyUriSpec uriSpec;
@Mock private WebClient.RequestBodySpec bodySpec;
@Mock private WebClient.RequestHeadersSpec<?> headersSpec;
@Mock private WebClient.ResponseSpec responseSpec;

when(webClient.post()).thenReturn(uriSpec);
when(uriSpec.uri(anyString())).thenReturn(bodySpec);
when(bodySpec.bodyValue(any())).thenReturn(headersSpec);
when(headersSpec.retrieve()).thenReturn(responseSpec);
when(responseSpec.bodyToMono(String.class)).thenReturn(Mono.just(GEMINI_FIXTURE_JSON));
```

### 5.4 Security context (when SUT calls `userService.getCurrentLoggedInUser()`)

Mock `userService.getCurrentLoggedInUser()` directly — do not stand up `SecurityContextHolder`.

### 5.5 Redis ops (cooldown / leaderboard cache)

Mock `RedisTemplate<String, ?>` + the `ValueOperations` chain. Do not run embedded redis.

### 5.6 JWT clock

Use `ReflectionTestUtils.setField(jwtUtils, "secret", "<48-byte hex>")` and pass explicit `Date` for `exp` — do not freeze system clock.

---

## 6. Acceptance criteria

- [ ] `./mvnw -q test` green on clean checkout.
- [ ] `./mvnw -q verify` produces `target/site/jacoco/index.html`.
- [ ] Every P0 SUT in Section 2 has a test file with ≥5 tests, ≥1 failure branch.
- [ ] Service-package line coverage **≥ 50%** overall, **≥ 70%** on the four P0 packages (`user`, `submission`, `contest`, `problem`).
- [ ] Zero tests touch Postgres / Redis / Judge0 / Gemini / S3 over the wire. (`grep -r "@SpringBootTest\|Testcontainers\|@DataJpaTest" src/test` → empty.)
- [ ] CLAUDE.md build-verification rule honored: `./mvnw -q compile` clean after each commit.

---

## 7. Risk register

| Risk                                                          | Mitigation                                                                                |
|---------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `WebClient` mock chain rots when SUT switches to `WebClient.Builder` | Centralize WebClient stubbing helper only after 3 duplications; otherwise inline.        |
| `ContestRatingService` golden values brittle on formula tweak | Tag the test class `@DisplayName("Frozen as of 2026-05-25")`; update intentionally.       |
| `SubmissionWorker` runs in a loop — easy to hang test         | Test the **single-iteration** method; do not invoke the `while(true)` loop directly.      |
| Coverage % looks low due to Lombok `@Data`/`@Builder`         | Excludes in Section 1.1 cover DTO/entity/config. If still low, add `Generated` exclusion. |
| Sonnet drifts to mass-generating low-value tests              | Section 0 rule #9: skip trivial passthroughs. Reviewer should reject getter-only tests.   |

---

## 8. Defense talking points (unchanged from prior draft)

- **Why unit-only?** Speed + reproducibility on examiner laptops. Controller is thin, repository is Spring Data — both lower-risk than service logic.
- **How was scope chosen?** Risk-weighted: judging pipeline, rating math, security boundary, registration guards.
- **What does the coverage number cover?** Instructions on `*.service` packages; DTOs/entities/configs excluded as logic-free.
- **Could a test pass while prod fails?** Yes — mocks lie. Mitigation: integration test work is an acknowledged Future Work item; security & rating use fixed-input fixtures matching production Judge0 / Gemini responses.

---

## 9. What was changed vs prior draft (audit trail)

- Replaced narrative "outlines" with discrete test-name lists Sonnet can execute one-by-one.
- Corrected class inventory: added `AuthServiceImpl`, `SubmissionQueueService`, `SubmissionJudgeService`, `ContestLeaderboardService`; flagged hintLLM multi-provider; removed nonexistent paths.
- Added per-batch verify gate (`mvnw -q test -Dtest=<X>`) — no batch can be declared done without it.
- Added Section 0 "Ground rules" + Section 3 "Per-batch instruction template" so each Sonnet session is self-bootstrapping.
- Added mock cookbook (Section 5) so Sonnet doesn't re-derive WebClient/Redis/JWT mocking.
- Moved Springdoc/OpenAPI workstream out of the test execution flow (Section 10 appendix) to keep batches single-purpose.
- Tightened acceptance criteria with a grep-based negative check for forbidden test annotations.

---

## 10. Appendix — Springdoc / OpenAPI (separate workstream, do NOT interleave with test batches)

Springdoc is already a dependency (`springdoc-openapi-starter-webmvc-ui 2.7.0`). Swagger UI lives at `http://localhost:8090/swagger-ui/index.html`.

Annotation passes (one PR per priority tier):
- **A1** Add `common/config/OpenApiConfig.java` with `bearerAuth` security scheme.
- **A2** Annotate P0 controllers: `UserController`, `AuthController`, `ProblemController`, `SubmissionController`, `ContestController` — add `@Tag` on class, `@Operation`(summary+description) on each method, `@ApiResponses` with realistic codes, `@SecurityRequirement(name="bearerAuth")` on protected endpoints.
- **A3** Annotate P1 controllers (`OrganizationController`, `TestCaseController`, `LabController`, `ProblemTagController`).
- **A4** Annotate P2 (`HintController`, `ProblemAIController`, `VisualizerController`, `UserStatisticsController`, rest).
- **A5** Annotate request/response DTOs with `@Schema(description, example)` on non-obvious fields.
- **A6** Export static spec: start app, run `curl http://localhost:8090/v3/api-docs > docs/openapi.json`, commit.

Skip the `springdoc-openapi-maven-plugin` integration-test generator — manual export is simpler and good enough for the defense artifact.
