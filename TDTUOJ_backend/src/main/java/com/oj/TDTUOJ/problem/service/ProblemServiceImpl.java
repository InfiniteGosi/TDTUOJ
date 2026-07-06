package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.utils.ProblemSlugUtils;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import com.oj.TDTUOJ.problemTag.repository.TagRepository;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.user.service.UserService;
import io.micrometer.core.instrument.Tags;
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

import java.net.URL;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Default {@link ProblemService} implementation.
 *
 * <p>Owns three cross-cutting concerns worth calling out:</p>
 * <ul>
 *   <li><b>Visibility guard</b> — public listings only return {@code isPublic} problems;
 *       single-problem lookup additionally exposes private problems to the author/staff,
 *       to contest participants while a contest runs, and to lab students.</li>
 *   <li><b>Unique slugs</b> — a title-derived slug is made collision-free by appending an
 *       incrementing suffix ({@code -1}, {@code -2}, …).</li>
 *   <li><b>S3 file lifecycle</b> — statement + per-test-case input/output files live under a
 *       {@code problems/{id}-{title}/} prefix; renames move files and prune the old prefix.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProblemServiceImpl implements ProblemService {
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserRepository userRepository;
    private final ModelMapper modelMapper;
    private final AwsS3Service awsS3Service;
    private final TagRepository tagRepository;
    private final SubmissionRepository submissionRepository;
    private final UserService userService;
    private final com.oj.TDTUOJ.contest.repository.ContestProblemRepository contestProblemRepository;
    private final com.oj.TDTUOJ.lab.repository.LabExerciseRepository labExerciseRepository;

    /**
     * Public, paginated problem listing. Only {@code isPublic} problems are returned
     * (every branch below routes to an {@code IsPublicTrue}/{@code isPublic = true} query).
     * The filter combination (title × tags × difficulty) selects which repository method runs.
     */
    @Override
    public Response<Page<ProblemDTO>> getAllProblems(Integer limit, Integer offset, String sortField,
                                                     String direction, String title, List<String> tagNames,
                                                     String difficulty) {
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        if (sortField == null || sortField.isBlank()) sortField = "id";
        if (direction == null || direction.isBlank()) direction = "asc";

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);
        int page = offset / limit; // translate a row offset into a zero-based page index
        Pageable pageable = PageRequest.of(page, limit, sort);

        // Resolve difficulty enum (null = no filter)
        ProblemDifficulty difficultyEnum = null;
        if (difficulty != null && !difficulty.isBlank()) {
            try {
                difficultyEnum = ProblemDifficulty.valueOf(difficulty.toUpperCase());
            } catch (IllegalArgumentException ignored) { /* invalid value → treat as no filter */ }
        }

        // Strip out any inactive tag names from the filter
        List<String> activeTagNames = null;
        if (tagNames != null && !tagNames.isEmpty()) {
            activeTagNames = tagNames.stream()
                    .map(name -> tagRepository.findByNameIgnoreCase(name).orElse(null))
                    .filter(tag -> tag != null && Boolean.TRUE.equals(tag.getIsActive()))
                    .map(Tag::getName)
                    .collect(Collectors.toList());
        }

        boolean hasTitle = title != null && !title.isBlank();
        boolean hasTags  = activeTagNames != null && !activeTagNames.isEmpty();
        boolean hasDiff  = difficultyEnum != null;

        Page<Problem> problemPage;
        if (hasTitle && hasTags && hasDiff) {
            problemPage = problemRepository.findByTitleAndTagsAndDifficulty(
                    title, activeTagNames, (long) activeTagNames.size(), difficultyEnum, pageable);
        } else if (hasTitle && hasTags) {
            problemPage = problemRepository.findByTitleContainingIgnoreCaseAndTagNames(
                    title, activeTagNames, (long) activeTagNames.size(), pageable);
        } else if (hasTitle && hasDiff) {
            problemPage = problemRepository.findByTitleContainingIgnoreCaseAndDifficulty(title, difficultyEnum, pageable);
        } else if (hasTags && hasDiff) {
            problemPage = problemRepository.findByTagNamesAndDifficulty(
                    activeTagNames, (long) activeTagNames.size(), difficultyEnum, pageable);
        } else if (hasTitle) {
            problemPage = problemRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(title, pageable);
        } else if (hasTags) {
            problemPage = problemRepository.findByTagNames(activeTagNames, (long) activeTagNames.size(), pageable);
        } else if (hasDiff) {
            problemPage = problemRepository.findByProblemDifficultyAndIsPublicTrue(difficultyEnum, pageable);
        } else {
            problemPage = problemRepository.findByIsPublicTrue(pageable);
        }

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problems retrieved successfully")
                .data(problemPage.map(this::mapToResponseDTO))
                .build();
    }

    /**
     * Single-problem lookup by slug with the visibility guard applied.
     * Private problems are hidden with a 404 (never 403) so the response does not
     * confirm the problem exists — except to the author/staff, mid-contest participants,
     * or lab students who legitimately need it.
     */
    @Override
    @Transactional
    public Response<ProblemDTO> getProblemBySlug(String slug) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        // Contest-fairness: a private problem's statement is visible only to
        // its author / staff, once a contest containing it has started
        // (participants need it mid-contest; it auto-publishes at contest end),
        // or when it is a lab exercise (org students need it; labs never publish).
        // 404 (not 403) — don't confirm the problem exists.
        if (!Boolean.TRUE.equals(problem.getIsPublic())
                && !contestProblemRepository.existsStartedContestAttachment(
                        problem.getId(), java.time.LocalDateTime.now())
                && !labExerciseRepository.existsByProblemId(problem.getId())
                && !isAuthorOrStaff(problem)) {
            throw new NotFoundException("Problem not found");
        }

        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(mapToResponseDTO(problem))
                .build();
    }

    /** Author, ADMIN, or CREATOR may view a private problem. Anonymous → false. */
    private boolean isAuthorOrStaff(Problem problem) {
        User viewer;
        try {
            viewer = userService.getCurrentLoggedInUser();
        } catch (Exception e) {
            return false; // anonymous
        }
        if (problem.getAuthor() != null && problem.getAuthor().getId().equals(viewer.getId())) {
            return true;
        }
        return viewer.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN")
                            || r.getName().equalsIgnoreCase("CREATOR"));
    }

    /** Lookup by numeric id. Intended for staff/internal use — does NOT apply the public/private guard. */
    @Override
    @Transactional
    public Response<ProblemDTO> getProblemById(Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Problem not found"));
        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(mapToResponseDTO(problem))
                .build();
    }

    /**
     * Create a problem: validate inputs, mint a unique slug, persist to obtain an id,
     * then upload the statement and each test case to S3 under {@code problems/{id}-{title}/}.
     * The entity is saved once up front so the generated id can be used in the S3 key prefix,
     * then re-saved after the file URLs are attached.
     */
    @Override
    @Transactional
    public Response<ProblemDTO> createProblem(ProblemDTO problemDTO) {
        try {
            if (problemDTO.getStatementFile() == null || problemDTO.getStatementFile().isEmpty()) {
                throw new IllegalArgumentException("Problem statement file is required");
            }
            if (problemDTO.getTestCases() == null || problemDTO.getTestCases().isEmpty()) {
                throw new IllegalArgumentException("At least one test case is required");
            }
            if (problemRepository.existsByTitle(problemDTO.getTitle())) {
                throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
            }

            // Slugify the title, then de-duplicate against existing slugs (title is unique,
            // but slugification can still collide, e.g. "C++" vs "C  " → "c").
            String uniqueSlug = generateUniqueSlug(ProblemSlugUtils.generateSlug(problemDTO.getTitle()));
            User author = userRepository.findById(problemDTO.getAuthorId())
                    .orElseThrow(() -> new NotFoundException("Author not found with id: " + problemDTO.getAuthorId()));

            // Only active tags may be assigned at creation time
            Set<Tag> problemTags = resolveTagsFromDTO(problemDTO);

            Problem problem = Problem.builder()
                    .title(problemDTO.getTitle())
                    .slug(uniqueSlug)
                    .point(problemDTO.getPoint())
                    .timeLimit(problemDTO.getTimeLimit())
                    .memoryLimit(problemDTO.getMemoryLimit())
                    .author(author)
                    .problemDifficulty(problemDTO.getProblemDifficulty())
                    .isPublic(problemDTO.getIsPublic() != null ? problemDTO.getIsPublic() : true)
                    .solutionCode(problemDTO.getSolutionCode())
                    .solutionLanguage(problemDTO.getSolutionLanguage())
                    .testCases(new ArrayList<>())
                    .tags(problemTags)
                    .build();

            problem = problemRepository.save(problem); // save first so problem.getId() exists for the S3 prefix

            String sanitizedTitle = sanitize(problemDTO.getTitle());
            String basePath = String.format("problems/%d-%s", problem.getId(), sanitizedTitle);

            String statementKey = basePath + "/statement.md";
            problem.setStatementFileUrl(awsS3Service.uploadFile(statementKey, problemDTO.getStatementFile()).toString());

            List<TestCase> testCases = new ArrayList<>();
            int idx = 0;
            for (TestCaseDTO tc : problemDTO.getTestCases()) {
                if (tc.getInputFile() == null || tc.getInputFile().isEmpty())
                    throw new IllegalArgumentException("Input file is required for test case " + idx);
                if (tc.getExpectedOutputFile() == null || tc.getExpectedOutputFile().isEmpty())
                    throw new IllegalArgumentException("Expected output file is required for test case " + idx);

                URL inputUrl = awsS3Service.uploadFile(String.format("%s/testcases/inputs/%d.txt", basePath, idx), tc.getInputFile());
                URL outputUrl = awsS3Service.uploadFile(String.format("%s/testcases/outputs/%d.txt", basePath, idx), tc.getExpectedOutputFile());
                testCases.add(TestCase.builder()
                        .inputFileUrl(inputUrl.toString())
                        .expectedOutputFileUrl(outputUrl.toString())
                        .isSample(Boolean.TRUE.equals(tc.getIsSample()))
                        .problem(problem)
                        .build());
                idx++;
            }

            testCaseRepository.saveAll(testCases);
            problem.setTestCases(testCases);
            problem.setCreatedAt(LocalDateTime.now());
            problem = problemRepository.save(problem);

            return Response.<ProblemDTO>builder()
                    .statusCode(HttpStatus.CREATED.value())
                    .message("Problem created successfully")
                    .data(mapToResponseDTO(problem))
                    .build();
        } catch (IllegalArgumentException ex) {
            log.error("Validation error while creating problem: {}", ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            log.error("Error creating problem: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to create problem: " + ex.getMessage(), ex);
        }
    }

    /**
     * Partial update of a problem (only non-null DTO fields are applied).
     *
     * <p>Because the S3 key prefix embeds the (sanitized) title, a title change forces
     * the slug to be regenerated and all statement/test-case files to be moved from
     * {@code oldBasePath} to {@code newBasePath}; the stale prefix is deleted at the end.
     * Test cases are reconciled by id: matched ones are updated in place, unmatched
     * incoming ones are created, and existing ones absent from the payload are deleted.</p>
     */
    @Override
    @Transactional
    public Response<ProblemDTO> updateProblem(ProblemDTO problemDTO) {
        try {
            Problem problem = problemRepository.findById(problemDTO.getId())
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemDTO.getId()));

            // S3 prefix is derived from id + title; a title change relocates every file under it.
            String oldBasePath = String.format("problems/%d-%s", problem.getId(), sanitize(problem.getTitle()));
            String newBasePath = oldBasePath;
            boolean pathChanged = false;

            // Title change — only process when title is provided
            if (problemDTO.getTitle() != null) {
                if (!problem.getTitle().equals(problemDTO.getTitle()) &&
                        problemRepository.existsByTitle(problemDTO.getTitle())) {
                    throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
                }

                if (!problem.getTitle().equals(problemDTO.getTitle())) {
                    problem.setSlug(generateUniqueSlugExcludingCurrent(
                            ProblemSlugUtils.generateSlug(problemDTO.getTitle()), problemDTO.getId()));
                }
                problem.setTitle(problemDTO.getTitle());

                newBasePath = String.format("problems/%d-%s", problem.getId(), sanitize(problemDTO.getTitle()));
                pathChanged = !oldBasePath.equals(newBasePath);
            }

            if (problemDTO.getPoint() != null) problem.setPoint(problemDTO.getPoint());
            if (problemDTO.getTimeLimit() != null) problem.setTimeLimit(problemDTO.getTimeLimit());
            if (problemDTO.getMemoryLimit() != null) problem.setMemoryLimit(problemDTO.getMemoryLimit());

            // Statement file
            if (problemDTO.getStatementFile() != null && !problemDTO.getStatementFile().isEmpty()) {
                if (problem.getStatementFileUrl() != null) {
                    try { awsS3Service.deleteFile(extractS3Key(problem.getStatementFileUrl())); }
                    catch (Exception e) { log.warn("Failed to delete old statement file: {}", e.getMessage()); }
                }
                problem.setStatementFileUrl(
                        awsS3Service.uploadFile(newBasePath + "/statement.md", problemDTO.getStatementFile()).toString());
            } else if (pathChanged && problem.getStatementFileUrl() != null) {
                String oldKey = extractS3Key(problem.getStatementFileUrl());
                String newKey = newBasePath + "/statement.md";
                awsS3Service.moveFile(oldKey, newKey);
                problem.setStatementFileUrl(awsS3Service.getFileUrl(newKey).toString());
            }

            // Test cases
            if (problemDTO.getTestCases() != null && !problemDTO.getTestCases().isEmpty()) {
                List<TestCase> existing = testCaseRepository.findTestCasesByProblemId(problem.getId());
                // Index existing test cases by id; entries are removed as they are matched below,
                // so whatever remains in the map afterwards is what the user deleted.
                Map<Long, TestCase> existingMap = existing.stream()
                        .collect(Collectors.toMap(TestCase::getId, tc -> tc));
                List<TestCase> updated = new ArrayList<>();
                int idx = 0;
                for (TestCaseDTO tc : problemDTO.getTestCases()) {
                    log.info("TestCase id={} isSample={}", tc.getId(), tc.getIsSample());
                    TestCase testCase;
                    if (tc.getId() != null && existingMap.containsKey(tc.getId())) {
                        testCase = existingMap.get(tc.getId());
                        testCase.setIsSample(Boolean.TRUE.equals(tc.getIsSample()));

                        boolean hasNewInput = tc.getInputFile() != null && !tc.getInputFile().isEmpty();
                        boolean hasNewOutput = tc.getExpectedOutputFile() != null && !tc.getExpectedOutputFile().isEmpty();

                        if (hasNewInput) {
                            // User edited this test case input — delete old, upload new
                            if (testCase.getInputFileUrl() != null)
                                awsS3Service.deleteFile(extractS3Key(testCase.getInputFileUrl()));
                            testCase.setInputFileUrl(awsS3Service.uploadFile(
                                    String.format("%s/testcases/inputs/%d.txt", newBasePath, idx), tc.getInputFile()).toString());
                        } else if (pathChanged && testCase.getInputFileUrl() != null) {
                            // Title changed → move the file to the new path
                            String oldKey = extractS3Key(testCase.getInputFileUrl());
                            String newKey = String.format("%s/testcases/inputs/%d.txt", newBasePath, idx);
                            awsS3Service.moveFile(oldKey, newKey);
                            testCase.setInputFileUrl(awsS3Service.getFileUrl(newKey).toString());
                        }

                        if (hasNewOutput) {
                            // User edited this test case output — delete old, upload new
                            if (testCase.getExpectedOutputFileUrl() != null)
                                awsS3Service.deleteFile(extractS3Key(testCase.getExpectedOutputFileUrl()));
                            testCase.setExpectedOutputFileUrl(awsS3Service.uploadFile(
                                    String.format("%s/testcases/outputs/%d.txt", newBasePath, idx), tc.getExpectedOutputFile()).toString());
                        } else if (pathChanged && testCase.getExpectedOutputFileUrl() != null) {
                            // Title changed → move the file to the new path
                            String oldKey = extractS3Key(testCase.getExpectedOutputFileUrl());
                            String newKey = String.format("%s/testcases/outputs/%d.txt", newBasePath, idx);
                            awsS3Service.moveFile(oldKey, newKey);
                            testCase.setExpectedOutputFileUrl(awsS3Service.getFileUrl(newKey).toString());
                        }

                        existingMap.remove(tc.getId());
                    } else {
                        // New test case — must have files
                        if (tc.getInputFile() == null || tc.getInputFile().isEmpty())
                            throw new IllegalArgumentException("Input file is required for new test case " + idx);
                        if (tc.getExpectedOutputFile() == null || tc.getExpectedOutputFile().isEmpty())
                            throw new IllegalArgumentException("Expected output file is required for new test case " + idx);
                        testCase = TestCase.builder()
                                .inputFileUrl(awsS3Service.uploadFile(
                                        String.format("%s/testcases/inputs/%d.txt", newBasePath, idx), tc.getInputFile()).toString())
                                .expectedOutputFileUrl(awsS3Service.uploadFile(
                                        String.format("%s/testcases/outputs/%d.txt", newBasePath, idx), tc.getExpectedOutputFile()).toString())
                                .isSample(Boolean.TRUE.equals(tc.getIsSample()))
                                .problem(problem)
                                .build();
                    }
                    updated.add(testCase);
                    idx++;
                }
                // Delete test cases that were removed by the user
                for (TestCase toRemove : existingMap.values()) {
                    log.warn("Deleting orphaned test case id={} for problem id={}", toRemove.getId(), problem.getId());
                    if (toRemove.getInputFileUrl() != null)
                        awsS3Service.deleteFile(extractS3Key(toRemove.getInputFileUrl()));
                    if (toRemove.getExpectedOutputFileUrl() != null)
                        awsS3Service.deleteFile(extractS3Key(toRemove.getExpectedOutputFileUrl()));
                    testCaseRepository.delete(toRemove);
                }
                testCaseRepository.saveAll(updated);
                problem.setTestCases(updated);
            }

            if (pathChanged) {
                try { awsS3Service.deleteFolder(oldBasePath); }
                catch (Exception e) { log.warn("Failed to delete old folder {}: {}", oldBasePath, e.getMessage()); }
            }

            if (problemDTO.getAuthorId() != null) {
                problem.setAuthor(userRepository.findById(problemDTO.getAuthorId())
                        .orElseThrow(() -> new NotFoundException("Author not found with id: " + problemDTO.getAuthorId())));
            }
            if (problemDTO.getProblemDifficulty() != null) {
                problem.setProblemDifficulty(problemDTO.getProblemDifficulty());
            }

            // Update tags only when the caller explicitly provides them
            if (problemDTO.getTagNames() != null || problemDTO.getTags() != null) {
                problem.setTags(resolveTagsFromDTO(problemDTO));
            }

            // Solution code
            if (problemDTO.getSolutionCode() != null) {
                problem.setSolutionCode(problemDTO.getSolutionCode());
            }
            if (problemDTO.getSolutionLanguage() != null) {
                problem.setSolutionLanguage(problemDTO.getSolutionLanguage());
            }
            if (problemDTO.getIsPublic() != null) {
                // Contest-fairness: a problem inside an upcoming/running contest
                // must stay private — it auto-publishes when the contest ends.
                if (Boolean.TRUE.equals(problemDTO.getIsPublic())
                        && !Boolean.TRUE.equals(problem.getIsPublic())
                        && contestProblemRepository.existsActiveContestAttachment(
                                problem.getId(), java.time.LocalDateTime.now())) {
                    throw new BadRequestException(
                            "This problem is part of an upcoming or running contest and cannot be "
                            + "published until the contest ends (it will be published automatically).");
                }
                problem.setIsPublic(problemDTO.getIsPublic());
            }

            problem.setUpdatedAt(LocalDateTime.now());
            problem = problemRepository.save(problem);

            return Response.<ProblemDTO>builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("Problem updated successfully")
                    .data(mapToResponseDTO(problem))
                    .build();
        } catch (IllegalArgumentException | BadRequestException ex) {
            log.error("Validation error while updating problem: {}", ex.getMessage());
            throw ex;
        } catch (NotFoundException ex) {
            log.error("Problem not found: {}", ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            log.error("Error updating problem: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to update problem: " + ex.getMessage(), ex);
        }
    }

    /**
     * Replaces the full tag set of a problem.
     * Only active tags are accepted; inactive tags throw BadRequestException.
     */
    @Override
    @Transactional
    public Response<ProblemDTO> updateProblemTags(Long problemId, ProblemDTO problemDTO) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemId));

        Set<Tag> newTags = resolveTagsFromDTO(problemDTO);
        problem.setTags(newTags);
        problem.setUpdatedAt(LocalDateTime.now());
        problem = problemRepository.save(problem);

        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem tags updated successfully")
                .data(mapToResponseDTO(problem))
                .build();
    }

    /** Delete a problem and best-effort purge all its S3 artifacts (test-case files, statement, folder). */
    @Override
    @Transactional
    public Response<?> deleteProblem(Long id) {
        try {
            Problem problem = problemRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + id));

            String basePath = String.format("problems/%d-%s", problem.getId(), sanitize(problem.getTitle()));
            List<TestCase> testCases = problem.getTestCases();

            if (testCases != null) {
                for (TestCase tc : testCases) {
                    try {
                        if (tc.getInputFileUrl() != null) awsS3Service.deleteFile(extractS3Key(tc.getInputFileUrl()));
                        if (tc.getExpectedOutputFileUrl() != null) awsS3Service.deleteFile(extractS3Key(tc.getExpectedOutputFileUrl()));
                    } catch (Exception e) {
                        log.warn("Failed to delete files for test case {}: {}", tc.getId(), e.getMessage());
                    }
                }
            }

            if (problem.getStatementFileUrl() != null) {
                try { awsS3Service.deleteFile(extractS3Key(problem.getStatementFileUrl())); }
                catch (Exception e) { log.warn("Failed to delete statement file: {}", e.getMessage()); }
            }

            try { awsS3Service.deleteFolder(basePath); }
            catch (Exception e) { log.warn("Failed to delete problem folder '{}': {}", basePath, e.getMessage()); }

            if (testCases != null && !testCases.isEmpty()) testCaseRepository.deleteAll(testCases);
            problemRepository.delete(problem);

            return Response.builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("Problem deleted successfully")
                    .build();
        } catch (NotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error deleting problem: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to delete problem: " + ex.getMessage(), ex);
        }
    }

    /**
     * Lecturer's own problem repository (public + private), newest first. Each row is
     * annotated with usage badges so the UI can warn before editing/deleting a problem
     * that is already attached to a contest or lab.
     */
    @Override
    public Response<Page<ProblemDTO>> getMyProblems(int page, int size, String search) {
        User currentUser = userService.getCurrentLoggedInUser();
        if (size <= 0) size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Problem> problems;
        if (search != null && !search.isBlank()) {
            problems = problemRepository.findByAuthorIdAndTitleContainingIgnoreCase(
                    currentUser.getId(), search.trim(), pageable);
        } else {
            problems = problemRepository.findByAuthorId(currentUser.getId(), pageable);
        }

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("My problems retrieved successfully")
                .data(problems.map(p -> {
                    ProblemDTO dto = mapToResponseDTO(p);
                    // Usage badges: where is this problem attached?
                    dto.setUsedInContest(contestProblemRepository.existsByProblemId(p.getId()));
                    dto.setUsedInLab(labExerciseRepository.existsByProblemId(p.getId()));
                    return dto;
                }))
                .build();
    }

    /**
     * Problems that may be attached to a contest: private and untouched by non-authors
     * (so no one has pre-solved them). ADMINs see all such problems; CREATORs see only
     * their own. Scope is chosen by role below.
     */
    @Override
    public Response<Page<ProblemDTO>> getContestEligibleProblems(int page, int size, String search) {
        User currentUser = userService.getCurrentLoggedInUser();
        if (size <= 0) size = 50;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        String term = search != null ? search.trim() : "";

        // ADMIN → all private problems; CREATOR → only problems they authored.
        boolean isAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
        Page<Problem> problems = isAdmin
                ? problemRepository.findContestEligibleAll(term, pageable)
                : problemRepository.findContestEligibleByAuthor(currentUser.getId(), term, pageable);

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Contest-eligible problems retrieved successfully")
                .data(problems.map(this::mapToResponseDTO))
                .build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Resolves a Set<Tag> from a ProblemDTO.
     * Prefers tagNames over tags DTOs. Supports lookup by tag ID or name.
     * Throws BadRequestException if any resolved tag is inactive.
     */
    private Set<Tag> resolveTagsFromDTO(ProblemDTO problemDTO) {
        List<String> tagNames = problemDTO.getTagNames();

        if (tagNames != null && !tagNames.isEmpty()) {
            return tagNames.stream()
                    .map(name -> {
                        Tag tag = tagRepository.findByNameIgnoreCase(name)
                                .orElseThrow(() -> new NotFoundException("Tag not found: " + name));
                        if (!Boolean.TRUE.equals(tag.getIsActive())) {
                            throw new BadRequestException("Tag '" + tag.getName() + "' is inactive and cannot be assigned to a problem");
                        }
                        return tag;
                    })
                    .collect(Collectors.toSet());
        }

        if (problemDTO.getTags() != null && !problemDTO.getTags().isEmpty()) {
            return problemDTO.getTags().stream()
                    .map(tagDTO -> {
                        Tag tag;
                        if (tagDTO.getId() != null) {
                            tag = tagRepository.findById(tagDTO.getId())
                                    .orElseThrow(() -> new NotFoundException("Tag not found with id: " + tagDTO.getId()));
                        } else {
                            tag = tagRepository.findByNameIgnoreCase(tagDTO.getName())
                                    .orElseThrow(() -> new NotFoundException("Tag not found: " + tagDTO.getName()));
                        }
                        if (!Boolean.TRUE.equals(tag.getIsActive())) {
                            throw new BadRequestException("Tag '" + tag.getName() + "' is inactive and cannot be assigned to a problem");
                        }
                        return tag;
                    })
                    .collect(Collectors.toSet());
        }

        return new HashSet<>();
    }

    /** Turns a title into a filesystem/S3-safe path segment (alnum + '-'/'_', collapsed dashes, lowercase). */
    private String sanitize(String title) {
        return title.replaceAll("[^a-zA-Z0-9-_]", "-")
                .replaceAll("-+", "-")
                .toLowerCase();
    }

    /** Derives the S3 object key from a stored file URL (the URL path minus its leading slash). */
    private String extractS3Key(String url) {
        try {
            URL s3Url = new URL(url);
            String key = s3Url.getPath();
            return key.startsWith("/") ? key.substring(1) : key;
        } catch (Exception e) {
            throw new RuntimeException("Invalid S3 URL: " + url, e);
        }
    }

    // Keep old name as alias for compatibility
    private String extractS3KeyFromUrl(String url) { return extractS3Key(url); }

    /** Appends {@code -1}, {@code -2}, … to the base slug until it is unique across all problems. */
    private String generateUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 1;
        while (problemRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }

    /** Same as {@link #generateUniqueSlug} but ignores the problem being updated, so it can keep its own slug. */
    private String generateUniqueSlugExcludingCurrent(String baseSlug, Long excludeId) {
        String slug = baseSlug;
        int counter = 1;
        while (problemRepository.existsBySlugAndIdNot(slug, excludeId)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }

    /**
     * Maps a Problem entity to a ProblemDTO for API responses.
     * ALL tags (active and inactive) are included so the frontend can warn about
     * tags that have been disabled or deleted after being assigned to a problem.
     */
    private ProblemDTO mapToResponseDTO(Problem problem) {
        ProblemDTO dto = new ProblemDTO();
        dto.setId(problem.getId());
        dto.setTitle(problem.getTitle());
        dto.setSlug(problem.getSlug());
        dto.setIsPublic(problem.getIsPublic());
        dto.setAuthorId(problem.getAuthor() != null ? problem.getAuthor().getId() : null);
        dto.setAuthorUserName(problem.getAuthor() != null ? problem.getAuthor().getUsername() : null);
        dto.setProblemDifficulty(problem.getProblemDifficulty());
        dto.setStatementFileUrl(problem.getStatementFileUrl());
        dto.setPoint(problem.getPoint());
        dto.setTimeLimit(problem.getTimeLimit());
        dto.setMemoryLimit(problem.getMemoryLimit());
        dto.setCreatedAt(problem.getCreatedAt());
        dto.setUpdatedAt(problem.getUpdatedAt());
        dto.setSolutionCode(problem.getSolutionCode());
        dto.setSolutionLanguage(problem.getSolutionLanguage());

        if (problem.getTestCases() != null) {
            dto.setTestCases(problem.getTestCases().stream()
                    .map(this::mapTestCaseToDTO)
                    .collect(Collectors.toList()));
        }

        if (problem.getTags() != null) {
            // Return all tags; isActive=false signals a disabled tag to the frontend
            dto.setTags(problem.getTags().stream()
                    .map(tag -> {
                        TagDTO tagDTO = new TagDTO();
                        tagDTO.setId(tag.getId());
                        tagDTO.setName(tag.getName());
                        tagDTO.setIsActive(tag.getIsActive());
                        return tagDTO;
                    })
                    .collect(Collectors.toSet()));
        }

        // Per-viewer progress flags. Resolving the current user throws for anonymous
        // callers, in which case both flags default to false (nothing solved/attempted).
        try {
            User currentUser = userService.getCurrentLoggedInUser();

            boolean solved = submissionRepository.existsByUserIdAndProblemIdAndSubmissionVerdict(
                    currentUser.getId(), problem.getId(), SubmissionVerdict.AC);
            // "attempted" is only meaningful when not yet solved
            boolean attempted = !solved && submissionRepository.existsByUserIdAndProblemId(
                    currentUser.getId(), problem.getId());

            dto.setSolved(solved);
            dto.setAttempted(attempted);
        } catch (Exception e) {
            dto.setSolved(false);
            dto.setAttempted(false);
        }

        return dto;
    }

    private TestCaseDTO mapTestCaseToDTO(TestCase testCase) {
        TestCaseDTO dto = new TestCaseDTO();
        dto.setId(testCase.getId());
        dto.setInputFileUrl(testCase.getInputFileUrl());
        dto.setExpectedOutputFileUrl(testCase.getExpectedOutputFileUrl());
        dto.setIsSample(testCase.getIsSample());
        dto.setTimeLimit(testCase.getTimeLimit());
        dto.setMemoryLimit(testCase.getMemoryLimit());
        dto.setPoints(testCase.getPoints());
        return dto;
    }
}