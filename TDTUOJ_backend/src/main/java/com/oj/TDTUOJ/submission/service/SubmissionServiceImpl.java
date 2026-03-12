package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.userdailyactivity.service.UserActivityService;
import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.judge0.Judge0Result;
import com.oj.TDTUOJ.judge0.Judge0Service;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import com.oj.TDTUOJ.userstatistics.service.UserStatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final UserService userService;
    private final ModelMapper modelMapper;
    private final ProblemRepository problemRepository;
    private final Judge0Service judge0Service;
    private final AwsS3Service awsS3Service;
    private final UserActivityService userActivityService;
    private final UserStatisticsService userStatisticsService;

    @Override
    public Response<SubmissionDTO> createSubmission(SubmissionDTO submissionDTO) {
        User currentUser = userService.getCurrentLoggedInUser();

        Problem problem = problemRepository.findById(submissionDTO.getProblemId())
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        // 1. Save as PENDING first
        Submission submission = Submission.builder()
                .sourceCode(submissionDTO.getSourceCode())
                .submissionLanguage(submissionDTO.getSubmissionLanguage())
                .submissionStatus(SubmissionStatus.PENDING)
                .submissionDate(LocalDateTime.now())
                .isPublic(Boolean.TRUE.equals(submissionDTO.getIsPublic()))
                .problem(problem)
                .userId(currentUser.getId())
                .contestId(submissionDTO.getContestId())
                .build();
        submission = submissionRepository.save(submission);

        // 2. Run against every test case
        List<TestCase> testCases = problem.getTestCases();
        int passed = 0;
        SubmissionVerdict finalVerdict = SubmissionVerdict.AC;
        String errorMessage = null;
        double maxTime = 0;
        int maxMemory = 0;

        for (TestCase tc : testCases) {
            // Fetch actual content from S3
            String input          = awsS3Service.readFileContent(tc.getInputFileUrl());
            String expectedOutput = awsS3Service.readFileContent(tc.getExpectedOutputFileUrl());

            Judge0Result result = judge0Service.judge(
                    submissionDTO.getSourceCode(),
                    submissionDTO.getSubmissionLanguage(),
                    input,
                    expectedOutput,
                    tc.getTimeLimit() != null ? tc.getTimeLimit() : problem.getTimeLimit(),
                    tc.getMemoryLimit() != null ? tc.getMemoryLimit() : problem.getMemoryLimit()
            );


            if (result.executionTime() != null)
                maxTime = Math.max(maxTime, result.executionTime());
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

        // 3. Update with real Judge0 results
        submission.setSubmissionVerdict(finalVerdict);
        submission.setSubmissionStatus(SubmissionStatus.COMPLETED);
        submission.setTestCasesPassed(passed);
        submission.setTotalTestCases(testCases.size());
        submission.setExecutionTime((int)(maxTime * 1000)); // seconds → ms
        submission.setMemoryUsed((double) maxMemory);
        submission.setErrorMessage(errorMessage);
        submissionRepository.save(submission);

        // 4. Record activity and statistics
        boolean isAccepted = finalVerdict == SubmissionVerdict.AC;
        boolean isPractice = submissionDTO.getContestId() == null;

        userActivityService.recordSubmission(currentUser.getId());

        int earnedPoints = 0;
        if (isAccepted) {
            // Exclude the submission we just saved so it doesn't count against itself.
            // This also tightens the simultaneous-submit race window to a single row.
            long priorAcCount = submissionRepository
                    .countByUserIdAndProblemIdAndSubmissionVerdictAndIdNot(
                            currentUser.getId(), problem.getId(), SubmissionVerdict.AC, submission.getId()
                    );

            if (priorAcCount == 0) {
                earnedPoints = isPractice
                        ? problem.getPoint()
                        : (int)(problem.getPoint() * 1.5);
                userStatisticsService.recordProblemSolved(currentUser.getId());
            }
        }

        userStatisticsService.recordSubmission(
                currentUser.getId(),
                isAccepted,
                earnedPoints,
                isPractice
        );

        // 5. Build response
        SubmissionDTO responseDTO = modelMapper.map(submission, SubmissionDTO.class);
        responseDTO.setProblemId(problem.getId());

        return Response.<SubmissionDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Submission judged successfully")
                .data(responseDTO)
                .build();
    }

    @Override
    public Response<Page<SubmissionDTO>> getMySubmissions(Integer limit, Integer offset, Long problemId) {
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        int page = offset / limit;

        Pageable pageable = PageRequest.of(page, limit,
                Sort.by(Sort.Direction.DESC, "submissionDate"));

        User currentUser = userService.getCurrentLoggedInUser();

        Page<Submission> submissionPage = (problemId == null)
                ? submissionRepository.findByUserId(currentUser.getId(), pageable)
                : submissionRepository.findByUserIdAndProblemId(currentUser.getId(), problemId, pageable);

        Page<SubmissionDTO> dtoPage = submissionPage.map(s -> {
            SubmissionDTO dto = modelMapper.map(s, SubmissionDTO.class);
            dto.setProblemId(s.getProblem() != null ? s.getProblem().getId() : null);
            return dto;
        });

        return Response.<Page<SubmissionDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Submissions retrieved successfully")
                .data(dtoPage)
                .build();
    }
}
