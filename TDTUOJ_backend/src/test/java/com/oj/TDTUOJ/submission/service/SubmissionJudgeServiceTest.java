package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
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
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userDailyActivity.service.UserActivityService;
import com.oj.TDTUOJ.userStatistics.service.UserStatisticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionJudgeServiceTest {
    @Mock private SubmissionRepository submissionRepository;
    @Mock private ProblemRepository problemRepository;
    @Mock private Judge0Service judge0Service;
    @Mock private AwsS3Service awsS3Service;
    @Mock private UserActivityService userActivityService;
    @Mock private UserStatisticsService userStatisticsService;
    @Mock private SubmissionQueueService submissionQueueService;
    @Mock private TestCaseRepository testCaseRepository;
    @Mock private ContestRepository contestRepository;
    @Mock private ContestProblemRepository contestProblemRepository;
    @Mock private ContestParticipationRepository contestParticipationRepository;
    @Mock private ContestRegistrationRepository contestRegistrationRepository;
    @Mock private ContestLeaderboardService leaderboardService;
    @Mock private UserRepository userRepository;

    @InjectMocks private SubmissionJudgeService judgeService;

    private SubmissionJobDTO job(Long submissionId, Long problemId, Long userId, Long contestId) {
        return SubmissionJobDTO.builder()
                .submissionId(submissionId)
                .problemId(problemId)
                .userId(userId)
                .contestId(contestId)
                .sourceCode("code")
                .submissionLanguage(SubmissionLanguage.PYTHON)
                .build();
    }

    private Submission submission(Long id) {
        Submission s = new Submission();
        s.setId(id);
        return s;
    }

    private Problem problem(Long id) {
        Problem p = new Problem();
        p.setId(id);
        p.setPoint(100);
        p.setTimeLimit(1.0);
        p.setMemoryLimit(64);
        return p;
    }

    private TestCase tc(String inUrl, String outUrl) {
        TestCase t = new TestCase();
        t.setInputFileUrl(inUrl);
        t.setExpectedOutputFileUrl(outUrl);
        return t;
    }

    @Test
    void judge_SubmissionMissing_ThrowsNotFound() {
        when(submissionRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> judgeService.judge(job(1L, 10L, 5L, null)));
    }

    @Test
    void judge_NoTestCases_DefaultsToAcCompleted() {
        // given
        Submission s = submission(1L);
        Problem p = problem(10L);
        when(submissionRepository.findById(1L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(Collections.emptyList());
        when(submissionRepository.countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                5L, 10L, SubmissionVerdict.AC, 1L)).thenReturn(0L);

        // when
        judgeService.judge(job(1L, 10L, 5L, null));

        // then
        assertEquals(SubmissionVerdict.AC, s.getSubmissionVerdict());
        assertEquals(SubmissionStatus.COMPLETED, s.getSubmissionStatus());
        assertEquals(0, s.getTestCasesPassed());
        assertEquals(0, s.getTotalTestCases());
        verify(submissionQueueService).clearPosition(1L);
        verify(userActivityService).recordSubmission(5L);
        verify(userStatisticsService).recordProblemSolved(5L);
        verify(userStatisticsService).recordSubmission(5L, true, 100);
    }

    @Test
    void judge_AllTestCasesPass_AcVerdict() {
        // given
        Submission s = submission(2L);
        Problem p = problem(10L);
        TestCase t1 = tc("in1", "out1");
        TestCase t2 = tc("in2", "out2");
        when(submissionRepository.findById(2L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(List.of(t1, t2));
        when(awsS3Service.readFileContent(any())).thenReturn("data");
        when(judge0Service.judge(any(), any(), any(), any(), any(), any()))
                .thenReturn(new Judge0Result(SubmissionVerdict.AC, null, 0.1, 1024));
        when(submissionRepository.countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                anyLong(), anyLong(), eq(SubmissionVerdict.AC), anyLong())).thenReturn(3L);

        // when
        judgeService.judge(job(2L, 10L, 5L, null));

        // then
        assertEquals(SubmissionVerdict.AC, s.getSubmissionVerdict());
        assertEquals(2, s.getTestCasesPassed());
        assertEquals(2, s.getTotalTestCases());
        // priorAcCount > 0 → no points awarded again
        verify(userStatisticsService, never()).recordProblemSolved(anyLong());
        verify(userStatisticsService).recordSubmission(5L, true, 0);
    }

    @Test
    void judge_FailingTestCase_StopsEarly_WaVerdict() {
        // given
        Submission s = submission(3L);
        Problem p = problem(10L);
        TestCase t1 = tc("in1", "out1");
        TestCase t2 = tc("in2", "out2");
        when(submissionRepository.findById(3L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(List.of(t1, t2));
        when(awsS3Service.readFileContent(any())).thenReturn("data");
        when(judge0Service.judge(any(), any(), any(), any(), any(), any()))
                .thenReturn(new Judge0Result(SubmissionVerdict.WA, "diff", 0.2, 512));

        // when
        judgeService.judge(job(3L, 10L, 5L, null));

        // then
        assertEquals(SubmissionVerdict.WA, s.getSubmissionVerdict());
        assertEquals(0, s.getTestCasesPassed());
        assertEquals("diff", s.getErrorMessage());
        verify(judge0Service, times(1)).judge(any(), any(), any(), any(), any(), any()); // stopped after first
        verify(userStatisticsService).recordSubmission(5L, false, 0);
    }

    @Test
    void judge_TleVerdict_PropagatedFromJudge0() {
        Submission s = submission(4L);
        Problem p = problem(10L);
        TestCase t1 = tc("in1", "out1");
        when(submissionRepository.findById(4L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(List.of(t1));
        when(awsS3Service.readFileContent(any())).thenReturn("data");
        when(judge0Service.judge(any(), any(), any(), any(), any(), any()))
                .thenReturn(new Judge0Result(SubmissionVerdict.TLE, null, 2.0, 4096));

        judgeService.judge(job(4L, 10L, 5L, null));

        assertEquals(SubmissionVerdict.TLE, s.getSubmissionVerdict());
        assertEquals(SubmissionStatus.COMPLETED, s.getSubmissionStatus());
    }

    @Test
    void judge_CeVerdict_PropagatedFromJudge0() {
        Submission s = submission(5L);
        Problem p = problem(10L);
        TestCase t1 = tc("in1", "out1");
        when(submissionRepository.findById(5L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(List.of(t1));
        when(awsS3Service.readFileContent(any())).thenReturn("data");
        when(judge0Service.judge(any(), any(), any(), any(), any(), any()))
                .thenReturn(new Judge0Result(SubmissionVerdict.CE, "syntax error", null, null));

        judgeService.judge(job(5L, 10L, 5L, null));

        assertEquals(SubmissionVerdict.CE, s.getSubmissionVerdict());
        assertEquals("syntax error", s.getErrorMessage());
    }

    @Test
    void judge_FirstAc_AwardsPointsAndRecordsSolved() {
        Submission s = submission(6L);
        Problem p = problem(10L);
        when(submissionRepository.findById(6L)).thenReturn(Optional.of(s));
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(testCaseRepository.findTestCasesByProblemId(10L)).thenReturn(Collections.emptyList());
        when(submissionRepository.countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                5L, 10L, SubmissionVerdict.AC, 6L)).thenReturn(0L);

        judgeService.judge(job(6L, 10L, 5L, null));

        verify(userStatisticsService).recordProblemSolved(5L);
        ArgumentCaptor<Integer> pts = ArgumentCaptor.forClass(Integer.class);
        verify(userStatisticsService).recordSubmission(eq(5L), eq(true), pts.capture());
        assertEquals(100, pts.getValue());
    }
}
