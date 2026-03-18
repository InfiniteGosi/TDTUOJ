package com.oj.TDTUOJ.submission.service;
import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.judge0.Judge0Result;
import com.oj.TDTUOJ.judge0.Judge0Service;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.userdailyactivity.service.UserActivityService;
import com.oj.TDTUOJ.userstatistics.service.UserStatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository; // ADD
import org.springframework.transaction.annotation.Transactional; // ADD

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionJudgeService {

    private final SubmissionRepository   submissionRepository;
    private final ProblemRepository      problemRepository;
    private final Judge0Service          judge0Service;
    private final AwsS3Service           awsS3Service;
    private final UserActivityService    userActivityService;
    private final UserStatisticsService  userStatisticsService;
    private final SubmissionQueueService submissionQueueService;
    private final TestCaseRepository     testCaseRepository;

    @Transactional
    public void judge(SubmissionJobDTO job) {
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

        // 4. Record activity and statistics
        boolean isAccepted = finalVerdict == SubmissionVerdict.AC;
        boolean isPractice = job.getContestId() == null;

        userActivityService.recordSubmission(job.getUserId());

        int earnedPoints = 0;
        if (isAccepted) {
            // Exclude the submission we just saved so it doesn't count against itself
            long priorAcCount = submissionRepository
                    .countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                            job.getUserId(), problem.getId(), SubmissionVerdict.AC, submission.getId()
                    );

            if (priorAcCount == 0) {
                earnedPoints = isPractice
                        ? problem.getPoint()
                        : (int)(problem.getPoint() * 1.5);
                userStatisticsService.recordProblemSolved(job.getUserId());
            }
        }

        userStatisticsService.recordSubmission(
                job.getUserId(),
                isAccepted,
                earnedPoints,
                isPractice
        );
    }
}
