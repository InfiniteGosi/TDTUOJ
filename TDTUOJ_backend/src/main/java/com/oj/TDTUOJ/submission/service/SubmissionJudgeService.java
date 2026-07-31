package com.oj.TDTUOJ.submission.service;
import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestProblemRepository;
import com.oj.TDTUOJ.contest.repository.ContestRegistrationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.service.ContestLeaderboardService;
import com.oj.TDTUOJ.judge0.Judge0Result;
import com.oj.TDTUOJ.judge0.Judge0Service;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.userDailyActivity.service.UserActivityService;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userStatistics.service.UserStatisticsService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * The core judging pipeline, invoked by {@link com.oj.TDTUOJ.submission.worker.SubmissionWorker}
 * for each dequeued submission.
 *
 * <p>Responsibilities, in order: mark the submission RUNNING, run the user's code against every
 * test case on Judge0, resolve a single final {@link SubmissionVerdict} (first-failure wins),
 * persist the result, then update per-user activity/statistics and — for accepted contest
 * submissions — the ICPC leaderboard. Failures inside the Judge0 loop are converted into an
 * Internal Error (IE) verdict so a submission never stays stuck in the queue, and leaderboard
 * failures are swallowed so they can never corrupt the judging result.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionJudgeService {

    /** ICPC-style time penalty added per wrong attempt made before the accepted submission. */
    private static final int WRONG_ATTEMPT_PENALTY_MINUTES = 20;

    private final SubmissionRepository           submissionRepository;
    private final ProblemRepository              problemRepository;
    private final Judge0Service                  judge0Service;
    private final AwsS3Service                   awsS3Service;
    private final UserActivityService            userActivityService;
    private final UserStatisticsService          userStatisticsService;
    private final SubmissionQueueService         submissionQueueService;
    private final TestCaseRepository             testCaseRepository;
    private final ContestRepository              contestRepository;
    private final ContestProblemRepository       contestProblemRepository;
    private final ContestParticipationRepository contestParticipationRepository;
    private final ContestRegistrationRepository  contestRegistrationRepository;
    private final ContestLeaderboardService      leaderboardService;
    private final UserRepository                 userRepository;
    private final MeterRegistry                  meterRegistry;

    /**
     * Judges a single submission end to end.
     *
     * <p>Runs in a transaction so the RUNNING → COMPLETED status transition and all downstream
     * stat/leaderboard writes commit atomically. Test cases are evaluated sequentially and the
     * loop short-circuits on the first non-AC result, so the reported verdict is that of the
     * earliest failing case; timing/memory are the maxima observed across the cases that ran.
     *
     * @param job the queued submission descriptor (ids, source code, language, optional contest)
     */
    @Transactional
    public void judge(SubmissionJobDTO job) {
        // Start the end-to-end latency timer; stopped once the verdict is committed (step 3).
        Timer.Sample judgeSample = Timer.start(meterRegistry);
        Submission submission = submissionRepository.findById(job.getSubmissionId())
                .orElseThrow(() -> new NotFoundException("Submission not found"));

        Problem problem = problemRepository.findById(job.getProblemId())
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        // Resolve contest style (IOI needs all test cases to run for partial scoring)
        ContestStyle contestStyle = null;
        if (job.getContestId() != null) {
            contestStyle = contestRepository.findById(job.getContestId())
                    .map(Contest::getContestStyle).orElse(null);
        }

        // 1. Mark as RUNNING — worker has picked it up, Judge0 is about to execute
        submission.setSubmissionStatus(SubmissionStatus.RUNNING);
        submissionRepository.save(submission);
        submissionQueueService.clearPosition(job.getSubmissionId()); // no longer in queue

        log.info("Running submissionId={}", submission.getId());

        // 2. Run against every test case.
        // Optimistic default: assume AC and downgrade the moment any case fails. `passed`
        // counts fully-accepted cases; maxTime/maxMemory track the worst resource usage seen.
        List<TestCase> testCases = testCaseRepository.findTestCasesByProblemId(job.getProblemId());
        int passed = 0;
        SubmissionVerdict finalVerdict = SubmissionVerdict.AC;
        String errorMessage = null;
        double maxTime   = 0;
        int    maxMemory = 0;

        try {
            for (TestCase tc : testCases) {
                // Test-case data lives in S3, not the DB — fetch input + expected output per case.
                String input          = awsS3Service.readFileContent(tc.getInputFileUrl());
                String expectedOutput = awsS3Service.readFileContent(tc.getExpectedOutputFileUrl());

                // Hand off to Judge0. Per-case time/memory limits override the problem defaults
                // when set. Judge0Service maps Judge0's raw status codes to a SubmissionVerdict
                // (AC/WA/TLE/MLE/RE/CE) and returns timing/memory for this run.
                Judge0Result result = judge0Service.judge(
                        job.getSourceCode(),
                        job.getSubmissionLanguage(),
                        input,
                        expectedOutput,
                        tc.getTimeLimit()   != null ? tc.getTimeLimit()   : problem.getTimeLimit(),
                        tc.getMemoryLimit() != null ? tc.getMemoryLimit() : problem.getMemoryLimit()
                );

                // Track the peak time/memory across all cases run so far (Judge0 may omit these
                // on a compile error, hence the null checks).
                if (result.executionTime() != null)
                    maxTime   = Math.max(maxTime,   result.executionTime());
                if (result.memoryUsed() != null)
                    maxMemory = Math.max(maxMemory, result.memoryUsed());

                if (result.verdict() == SubmissionVerdict.AC) {
                    passed++;
                } else {
                    finalVerdict = result.verdict();
                    errorMessage = result.errorMessage();
                    // ICPC: stop on first failure. IOI: keep running all test cases for partial scoring.
                    if (contestStyle != ContestStyle.IOI) {
                        break;
                    }
                }
            }
        } catch (Exception e) {
            // Judge engine unreachable / hung / errored. Commit an Internal Error verdict
            // so the submission resolves instead of being stuck "IN QUEUE" forever.
            log.error("Judging failed for submissionId={} — marking IE", submission.getId(), e);
            submission.setSubmissionVerdict(SubmissionVerdict.IE);
            submission.setSubmissionStatus(SubmissionStatus.COMPLETED);
            submission.setTestCasesPassed(0);
            submission.setTotalTestCases(testCases.size());
            submission.setErrorMessage("Judge engine unavailable. Please try again later.");
            submissionRepository.save(submission);
            meterRegistry.counter("submissions.judged", "verdict", SubmissionVerdict.IE.name()).increment();
            return; // skip stats/leaderboard — an infra failure is not a real attempt
        }

        // IOI: final verdict is AC only if ALL test cases passed
        if (contestStyle == ContestStyle.IOI && passed == testCases.size()) {
            finalVerdict = SubmissionVerdict.AC;
        }

        // 3. Update submission with Judge0 results. Reaching here means either every case
        // passed (finalVerdict stays AC) or the loop broke early on the first failure.
        submission.setSubmissionVerdict(finalVerdict);
        submission.setSubmissionStatus(SubmissionStatus.COMPLETED);
        submission.setTestCasesPassed(passed);
        submission.setTotalTestCases(testCases.size());
        submission.setExecutionTime((int)(maxTime * 1000)); // seconds → ms
        submission.setMemoryUsed((double) maxMemory);
        submission.setErrorMessage(errorMessage);
        submissionRepository.save(submission);

        log.info("Judged submissionId={} verdict={} passed={}/{}",
                submission.getId(), finalVerdict, passed, testCases.size());

        // Metrics: count verdicts and record end-to-end judging latency
        meterRegistry.counter("submissions.judged", "verdict", finalVerdict.name()).increment();
        judgeSample.stop(Timer.builder("submissions.judge.duration")
                .description("End-to-end judging time per submission")
                .publishPercentileHistogram()
                .register(meterRegistry));

        // 4. Record activity and statistics.
        // isPractice: no contestId means a normal practice submission (drives whether the
        // leaderboard is touched in step 5).
        boolean isAccepted = finalVerdict == SubmissionVerdict.AC;
        boolean isPractice = job.getContestId() == null;

        userActivityService.recordSubmission(job.getUserId());

        int earnedPoints = 0;
        if (isAccepted) {
            // Global check: has this user ever AC'd this problem before (in any mode)?
            // Exclude the current submission so it doesn't count itself as a prior solve.
            long priorAcCount = submissionRepository
                    .countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                            job.getUserId(), problem.getId(), SubmissionVerdict.AC, submission.getId()
                    );

            if (priorAcCount == 0) {
                // First time solving this problem — award points once so repeated AC
                // submissions don't inflate the user's score.
                earnedPoints = problem.getPoint();
                userStatisticsService.recordProblemSolved(job.getUserId());
            }
        }

        userStatisticsService.recordSubmission(
                job.getUserId(),
                isAccepted,
                earnedPoints
        );

        // 5. Update the real-time leaderboard for contest submissions
        if (!isPractice) {
            if (contestStyle == ContestStyle.IOI) {
                updateIOILeaderboard(job, submission, problem, passed, testCases.size());
            } else if (isAccepted) {
                updateContestLeaderboard(job, submission, problem);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // ICPC Leaderboard update
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Called after an accepted contest submission.
     *
     * <p>ICPC penalty for a problem:
     * <pre>
     *   penaltyMinutes = minutesFromStart(firstACTime) + 20 × wrongAttemptsBeforeAC
     * </pre>
     * The cumulative {@code ContestParticipation.penaltyTime} is the sum
     * of per-problem penalties for every solved problem.
     */
    private void updateContestLeaderboard(SubmissionJobDTO job, Submission submission, Problem problem) {
        Long contestId = job.getContestId();

        try {
            Contest contest = contestRepository.findById(contestId)
                    .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));

            User user = userRepository.findById(job.getUserId())
                    .orElseThrow(() -> new NotFoundException("User not found: " + job.getUserId()));

            // ── Guard: contest must be currently running ─────────────────────
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(contest.getStartTime()) || now.isAfter(contest.getEndTime())) {
                log.debug("Submission for contestId={} ignored for leaderboard: contest is not running", contestId);
                return;
            }

            // ── Guard: user must have an approved registration ───────────────
            boolean isRegistered = contestRegistrationRepository
                    .existsByContestIdAndUserIdAndStatus(
                            contestId, job.getUserId(), ContestRegistrationStatus.APPROVED);
            if (!isRegistered) {
                log.warn("User {} submitted to contestId={} without an approved registration — leaderboard not updated",
                        job.getUserId(), contestId);
                return;
            }

            // ── Get or create participation row ──────────────────────────────
            ContestParticipation participation = contestParticipationRepository
                    .findByContestIdAndUserId(contestId, job.getUserId())
                    .orElseGet(() -> {
                        ContestParticipation newP = ContestParticipation.builder()
                                .contest(contest)
                                .user(user)
                                .build();
                        return contestParticipationRepository.save(newP);
                    });

            // ── Skip if this problem was already AC'd IN THIS CONTEST (idempotency guard) ────
            ContestProblem contestProblem = contestProblemRepository
                    .findByContestIdAndProblemId(contestId, problem.getId())
                    .orElse(null);
            if (contestProblem == null) {
                log.warn("Problem {} is not part of contest {} — leaderboard not updated",
                        problem.getId(), contestId);
                return;
            }

            long priorAcForThisProblem = submissionRepository
                    .countByUserIdAndProblemIdAndContestIdAndSubmissionVerdictAndIdNot(
                            job.getUserId(), problem.getId(),
                            contestId,
                            SubmissionVerdict.AC, submission.getId());

            if (priorAcForThisProblem > 0) {
                // Already solved in this contest — no point re-updating the leaderboard
                log.debug("User {} already solved problem {} in contest {} — skip leaderboard update",
                        job.getUserId(), problem.getId(), contestId);
                return;
            }

            // ── Minutes from contest start to this acceptance ────────────────
            int minutesFromStart = (int) Duration
                    .between(contest.getStartTime(), submission.getSubmissionDate())
                    .toMinutes();

            // ── Wrong attempts for this problem WITHIN THIS CONTEST before this AC ──
            long wrongAttempts = submissionRepository
                    .countByUserIdAndProblemIdAndContestIdAndSubmissionVerdict(
                            job.getUserId(), problem.getId(),
                            contestId,
                            SubmissionVerdict.WA);

            int problemPenalty = minutesFromStart
                    + (int)(wrongAttempts * WRONG_ATTEMPT_PENALTY_MINUTES);

            // ── Update participation row ──────────────────────────────────────
            int newSolved  = participation.getProblemsSolved() + 1;
            int newPenalty = participation.getPenaltyTime() + problemPenalty;

            participation.setProblemsSolved(newSolved);
            participation.setPenaltyTime(newPenalty);
            participation.setScore(newSolved); // ICPC score = problems solved
            contestParticipationRepository.save(participation);

            // ── Build per-problem status for the scoreboard grid ─────────────
            ScoreboardEntryDTO.ProblemScoreDTO probStatus = new ScoreboardEntryDTO.ProblemScoreDTO();
            probStatus.setProblemId(problem.getId());
            probStatus.setProblemOrder(contestProblem.getProblemOrder());
            probStatus.setSolved(true);
            probStatus.setAttempts((int) wrongAttempts);
            probStatus.setPenaltyMinutes(minutesFromStart);
            probStatus.setPointsEarned(contestProblem.getPoints());

            // ── Push to Redis leaderboard ─────────────────────────────────────
            leaderboardService.recordAcceptedSubmission(
                    contestId,
                    job.getUserId(),
                    user.getUsername(),
                    user.getProfileUrl(),
                    problem.getId(),
                    contestProblem.getProblemOrder(),
                    newPenalty,
                    newSolved,
                    probStatus
            );

            log.info("Leaderboard updated: contestId={} userId={} solved={} totalPenalty={}",
                    contestId, job.getUserId(), newSolved, newPenalty);

        } catch (Exception e) {
            // Leaderboard update must never break the judging flow
            log.error("Failed to update leaderboard for contestId={} userId={}",
                    contestId, job.getUserId(), e);
        }
    }

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

            int currentPoints = participation.getPointsEarned() != null ? participation.getPointsEarned() : 0;
            int currentSolved = participation.getProblemsSolved() != null ? participation.getProblemsSolved() : 0;
            int newTotalPoints = currentPoints + improvement;
            int newSolved = currentSolved
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
}
