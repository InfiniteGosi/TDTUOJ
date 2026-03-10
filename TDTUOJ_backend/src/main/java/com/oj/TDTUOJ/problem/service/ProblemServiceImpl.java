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

    @Override
    public Response<Page<ProblemDTO>> getAllProblems(Integer limit, Integer offset, String sortField,
                                                     String direction, String title, List<String> tagNames,
                                                     String difficulty) {
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        if (sortField == null || sortField.isBlank()) sortField = "id";
        if (direction == null || direction.isBlank()) direction = "asc";

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);
        int page = offset / limit;
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
            problemPage = problemRepository.findByTitleContainingIgnoreCase(title, pageable);
        } else if (hasTags) {
            problemPage = problemRepository.findByTagNames(activeTagNames, (long) activeTagNames.size(), pageable);
        } else if (hasDiff) {
            problemPage = problemRepository.findByProblemDifficulty(difficultyEnum, pageable);
        } else {
            problemPage = problemRepository.findAll(pageable);
        }

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problems retrieved successfully")
                .data(problemPage.map(this::mapToResponseDTO))
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemDTO> getProblemBySlug(String slug) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Problem not found"));
        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(mapToResponseDTO(problem))
                .build();
    }

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
                    .testCases(new ArrayList<>())
                    .tags(problemTags)
                    .build();

            problem = problemRepository.save(problem);

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

    @Override
    @Transactional
    public Response<ProblemDTO> updateProblem(ProblemDTO problemDTO) {
        log.info(problemDTO.toString());
        try {
            Problem problem = problemRepository.findById(problemDTO.getId())
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemDTO.getId()));

            if (!problem.getTitle().equals(problemDTO.getTitle()) &&
                    problemRepository.existsByTitle(problemDTO.getTitle())) {
                throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
            }

            String oldBasePath = String.format("problems/%d-%s", problem.getId(), sanitize(problem.getTitle()));

            if (!problem.getTitle().equals(problemDTO.getTitle())) {
                problem.setSlug(generateUniqueSlugExcludingCurrent(
                        ProblemSlugUtils.generateSlug(problemDTO.getTitle()), problemDTO.getId()));
            }
            problem.setTitle(problemDTO.getTitle());
            problem.setPoint(problemDTO.getPoint());
            problem.setTimeLimit(problemDTO.getTimeLimit());
            problem.setMemoryLimit(problemDTO.getMemoryLimit());

            String newBasePath = String.format("problems/%d-%s", problem.getId(), sanitize(problemDTO.getTitle()));
            boolean pathChanged = !oldBasePath.equals(newBasePath);

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
                Map<Long, TestCase> existingMap = existing.stream()
                        .collect(Collectors.toMap(TestCase::getId, tc -> tc));
                List<TestCase> updated = new ArrayList<>();
                int idx = 0;
                for (TestCaseDTO tc : problemDTO.getTestCases()) {
                    TestCase testCase;
                    if (tc.getId() != null && existingMap.containsKey(tc.getId())) {
                        testCase = existingMap.get(tc.getId());
                        if (tc.getInputFile() != null && !tc.getInputFile().isEmpty()) {
                            if (testCase.getInputFileUrl() != null)
                                awsS3Service.deleteFile(extractS3Key(testCase.getInputFileUrl()));
                            testCase.setInputFileUrl(awsS3Service.uploadFile(
                                    String.format("%s/testcases/inputs/%d.txt", newBasePath, idx), tc.getInputFile()).toString());
                        }
                        if (tc.getExpectedOutputFile() != null && !tc.getExpectedOutputFile().isEmpty()) {
                            if (testCase.getExpectedOutputFileUrl() != null)
                                awsS3Service.deleteFile(extractS3Key(testCase.getExpectedOutputFileUrl()));
                            testCase.setExpectedOutputFileUrl(awsS3Service.uploadFile(
                                    String.format("%s/testcases/outputs/%d.txt", newBasePath, idx), tc.getExpectedOutputFile()).toString());
                        }
                        existingMap.remove(tc.getId());
                    } else {
                        testCase = TestCase.builder()
                                .inputFileUrl(awsS3Service.uploadFile(
                                        String.format("%s/testcases/inputs/%d.txt", newBasePath, idx), tc.getInputFile()).toString())
                                .expectedOutputFileUrl(awsS3Service.uploadFile(
                                        String.format("%s/testcases/outputs/%d.txt", newBasePath, idx), tc.getExpectedOutputFile()).toString())
                                .problem(problem)
                                .build();
                    }
                    updated.add(testCase);
                    idx++;
                }
                for (TestCase toRemove : existingMap.values()) {
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

        log.info("Tags updated for problem {}: {}", problemId,
                newTags.stream().map(Tag::getName).collect(Collectors.joining(", ")));

        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem tags updated successfully")
                .data(mapToResponseDTO(problem))
                .build();
    }

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

    private String sanitize(String title) {
        return title.replaceAll("[^a-zA-Z0-9-_]", "-")
                .replaceAll("-+", "-")
                .toLowerCase();
    }

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

    private String generateUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 1;
        while (problemRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }

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

        try {
            User currentUser = userService.getCurrentLoggedInUser();

            boolean solved = submissionRepository.existsByUserIdAndProblemIdAndSubmissionVerdict(
                    currentUser.getId(), problem.getId(), SubmissionVerdict.AC);
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
        dto.setIsSample(testCase.isSample());
        dto.setTimeLimit(testCase.getTimeLimit());
        dto.setMemoryLimit(testCase.getMemoryLimit());
        dto.setPoints(testCase.getPoints());
        return dto;
    }
}