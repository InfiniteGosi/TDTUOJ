package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.dto.SubmissionAnalysisResult;
import com.oj.TDTUOJ.common.utils.ContestLockUtil;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.repository.ContestRegistrationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.lab.repository.LabRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository          submissionRepository;
    private final UserService                   userService;
    private final ModelMapper                   modelMapper;
    private final ProblemRepository             problemRepository;
    private final SubmissionQueueService        submissionQueueService;
    private final LabRepository                 labRepository;
    private final ContestRepository             contestRepository;
    private final ContestRegistrationRepository contestRegistrationRepository;
    private final SubmissionAnalysisService     submissionAnalysisService;
    private final AwsS3Service                  awsS3Service;
    private final ObjectMapper                  objectMapper = new ObjectMapper();

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

        // 2b. Contest registration guard
        if (submissionDTO.getContestId() != null) {
            Long contestId = submissionDTO.getContestId();
            Contest contest = contestRepository.findById(contestId).orElse(null);
            if (contest != null) {
                boolean isAdmin   = currentUser.getRoles().stream()
                        .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
                boolean isCreator = contest.getCreator() != null
                        && contest.getCreator().getId().equals(currentUser.getId());
                if (!isAdmin && !isCreator) {
                    boolean isApproved = contestRegistrationRepository
                            .existsByContestIdAndUserIdAndStatus(
                                    contestId, currentUser.getId(),
                                    ContestRegistrationStatus.APPROVED);
                    if (!isApproved) {
                        return Response.<SubmissionDTO>builder()
                                .statusCode(HttpStatus.FORBIDDEN.value())
                                .message("You are not registered for this contest.")
                                .data(null)
                                .build();
                    }
                }
            }
        }

        // 2c. Lab deadline enforcement — hard lock
        if (submissionDTO.getLabId() != null) {
            var lab = labRepository.findById(submissionDTO.getLabId()).orElse(null);
            if (lab != null && lab.getDeadline() != null
                    && LocalDateTime.now().isAfter(lab.getDeadline())) {
                return Response.<SubmissionDTO>builder()
                        .statusCode(HttpStatus.FORBIDDEN.value())
                        .message("Lab deadline has passed. Submissions are no longer accepted.")
                        .data(null)
                        .build();
            }
        }

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
                .labId(submissionDTO.getLabId())
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

        // Contest fairness: hide locked-contest submissions from non-owners.
        // 404 (not 403) — don't confirm the submission exists.
        if (submission.getContestId() != null) {
            Contest contest = contestRepository.findById(submission.getContestId()).orElse(null);
            if (contest != null
                    && ContestLockUtil.isLocked(contest, LocalDateTime.now())
                    && !canViewLockedSubmission(submission, contest)) {
                throw new NotFoundException("Submission not found");
            }
        }

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

    /** Owner, ADMIN, or contest creator may view a locked-contest submission. */
    private boolean canViewLockedSubmission(Submission submission, Contest contest) {
        User viewer;
        try {
            viewer = userService.getCurrentLoggedInUser();
        } catch (Exception e) {
            return false; // anonymous
        }
        if (viewer.getId().equals(submission.getUserId())) return true;
        boolean isAdmin = viewer.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        boolean isCreator = contest.getCreator() != null
                && contest.getCreator().getId().equals(viewer.getId());
        return isAdmin || isCreator;
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

    @Override
    public Response<Long> getTotalSubmissionsCount() {
        return Response.<Long>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Total submissions count")
                .data(submissionRepository.count())
                .build();
    }

    @Override
    @Transactional
    public Response<SubmissionAnalysisResult> getSubmissionAnalysis(Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Submission not found"));

        // Guard: analysis is only meaningful for an Accepted submission.
        if (submission.getSubmissionVerdict() != SubmissionVerdict.AC) {
            return Response.<SubmissionAnalysisResult>builder()
                    .statusCode(HttpStatus.BAD_REQUEST.value())
                    .message("Analysis is only available for Accepted submissions")
                    .build();
        }

        // Guard: only the owner (or an ADMIN) may analyze a submission.
        User currentUser = userService.getCurrentLoggedInUser();
        boolean isOwner = submission.getUserId() != null
                && submission.getUserId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        if (!isOwner && !isAdmin) {
            return Response.<SubmissionAnalysisResult>builder()
                    .statusCode(HttpStatus.FORBIDDEN.value())
                    .message("You can only analyze your own submissions")
                    .build();
        }

        // Cache hit — return the stored analysis without calling Gemini again.
        if (submission.getAnalysis() != null && !submission.getAnalysis().isBlank()) {
            try {
                SubmissionAnalysisResult cached = objectMapper.readValue(
                        submission.getAnalysis(), SubmissionAnalysisResult.class);
                return ok(cached);
            } catch (Exception e) {
                log.warn("Cached analysis for submissionId={} is unparseable, regenerating", id, e);
            }
        }

        // Best-effort: pull the problem statement from S3 for richer context.
        Problem problem = submission.getProblem();
        String title = problem != null ? problem.getTitle() : "(unknown)";
        String statement = null;
        try {
            if (problem != null && problem.getStatementFileUrl() != null) {
                statement = awsS3Service.readFileContent(problem.getStatementFileUrl());
            }
        } catch (Exception e) {
            log.warn("Could not read statement for analysis of submissionId={}", id, e);
        }

        SubmissionAnalysisResult result = submissionAnalysisService.analyze(
                title, statement, submission.getSubmissionLanguage(), submission.getSourceCode());

        // Persist for future views.
        try {
            submission.setAnalysis(objectMapper.writeValueAsString(result));
            submissionRepository.save(submission);
        } catch (Exception e) {
            log.warn("Failed to cache analysis for submissionId={}", id, e);
        }

        return ok(result);
    }

    private Response<SubmissionAnalysisResult> ok(SubmissionAnalysisResult data) {
        return Response.<SubmissionAnalysisResult>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Submission analysis")
                .data(data)
                .build();
    }
}
