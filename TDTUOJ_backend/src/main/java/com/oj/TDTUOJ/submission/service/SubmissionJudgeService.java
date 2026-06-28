package com.oj.TDTUOJ.submission.service;
import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionJudgeService {

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

    @Transactional
    public void judge(SubmissionJobDTO job) {
        Timer.Sample judgeSample = Timer.start(meterRegistry);
        Submission submission = submissionRepository.findById(job.getSubmissionId())
                .orElseThrow(() -> new NotFoundException("Submission not found"));

        Problem problem = problemRepository.findById(job.getProblemId())
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        // 1. Mark as RUNNING — worker has picked it up, Judge0 is about to execute
        submission.setSubmissionStatus(SubmissionStatus.RUNNING);
        submissionRepository.save(submission);
        submissionQueueService.clearPosition(job.getSubmissionId()); // no longer in queue

        log.info("Running submissionId={}", submission.getId());

        // 2. Run against every test case
        List<TestCase> testCases = testCaseRepository.findTestCasesByProblemId(job.getProblemId());
        int passed = 0;
        SubmissionVerdict finalVerdict = SubmissionVerdict.AC;
        String errorMessage = null;
        double maxTime   = 0;
        int    maxMemory = 0;

        try {
            for (TestCase tc : testCases) {
                String input          = awsS3Service.readFileContent(tc.getInputFileUrl());
                String expectedOutput = awsS3Service.readFileContent(tc.getExpectedOutputFileUrl());

                Judge0Result result = judge0Service.judge(
                        job.getSourceCode(),
                        job.getSubmissionLanguage(),
                        input,
                        expectedOutput,
                        tc.getTimeLimit()   != null ? tc.getTimeLimit()   : problem.getTimeLimit(),
                        tc.getMemoryLimit() != null ? tc.getMemoryLimit() : problem.getMemoryLimit()
                );

                if (result.executionTime() != null)
                    maxTime   = Math.max(maxTime,   result.executionTime());
                if (result.memoryUsed() != null)
                    maxMemory = Math.max(maxMemory, result.memoryUsed());

                if (result.verdict() == SubmissionVerdict.AC) {
                    passed++;
                } else {
                    finalVerdict = result.verdict();
                    errorMessage = result.errorMessage();
                    break; // stop on first failure
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

        // 3. Update submission with Judge0 results
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

        // 4. Record activity and statistics
        boolean isAccepted = finalVerdict == SubmissionVerdict.AC;
        boolean isPractice = job.getContestId() == null;

        userActivityService.recordSubmission(job.getUserId());

        int earnedPoints = 0;
        if (isAccepted) {
            // Global check: has this user ever AC'd this problem before (in any mode)?
            long priorAcCount = submissionRepository
                    .countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                            job.getUserId(), problem.getId(), SubmissionVerdict.AC, submission.getId()
                    );

            if (priorAcCount == 0) {
                // First time solving this problem — award points once
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
        if (isAccepted && !isPractice) {
            updateContestLeaderboard(job, submission, problem);
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
}
