package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
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

    private final SubmissionRepository   submissionRepository;
    private final UserService            userService;
    private final ModelMapper            modelMapper;
    private final ProblemRepository      problemRepository;
    private final SubmissionQueueService submissionQueueService;

    @Override
    public Response<SubmissionDTO> createSubmission(SubmissionDTO submissionDTO) {
        User currentUser = userService.getCurrentLoggedInUser();

        // 1. Rate limit check — one submission per cooldown window
        if (submissionQueueService.isOnCooldown(currentUser.getId())) {
            return Response.<SubmissionDTO>builder()
                    .statusCode(HttpStatus.TOO_MANY_REQUESTS.value())
                    .message("Please wait " + submissionQueueService.getCooldownSeconds()
                            + " seconds before submitting again")
                    .data(null)
                    .build();
        }

        Problem problem = problemRepository.findById(submissionDTO.getProblemId())
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        // 2. Save as PENDING immediately
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

        // 3. Push to Redis queue — worker picks it up asynchronously
        SubmissionJobDTO job = SubmissionJobDTO.builder()
                .submissionId(submission.getId())
                .problemId(problem.getId())
                .userId(currentUser.getId())
                .contestId(submissionDTO.getContestId())
                .sourceCode(submissionDTO.getSourceCode())
                .submissionLanguage(submissionDTO.getSubmissionLanguage())
                .isPublic(submissionDTO.getIsPublic())
                .build();
        submissionQueueService.enqueue(job);

        // 4. Start cooldown for this user
        submissionQueueService.setCooldown(currentUser.getId());

        // 5. Return immediately with PENDING status + queue position
        SubmissionDTO responseDTO = modelMapper.map(submission, SubmissionDTO.class);
        responseDTO.setProblemId(problem.getId());
        responseDTO.setQueuePosition(submissionQueueService.getQueuePosition(submission.getId()));

        return Response.<SubmissionDTO>builder()
                .statusCode(HttpStatus.ACCEPTED.value())
                .message("Submission received, judging in progress")
                .data(responseDTO)
                .build();
    }

    @Override
    public Response<SubmissionDTO> getSubmissionStatus(Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Submission not found"));

        // 1. Map base fields
        SubmissionDTO dto = modelMapper.map(submission, SubmissionDTO.class);
        dto.setProblemId(submission.getProblem() != null ? submission.getProblem().getId() : null);

        // 2. Only PENDING submissions have a queue position
        if (submission.getSubmissionStatus() == SubmissionStatus.PENDING) {
            dto.setQueuePosition(submissionQueueService.getQueuePosition(id));
        }

        return Response.<SubmissionDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Submission status retrieved successfully")
                .data(dto)
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
