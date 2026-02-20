package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.utils.ProblemSlugUtils;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    @Override
    public Response<Page<ProblemDTO>> getAllProblems(Integer limit,
                                                     Integer offset,
                                                     String sortField,
                                                     String direction,
                                                     String title) {
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        if (sortField == null || sortField.isBlank()) sortField = "id";
        if (direction == null || direction.isBlank()) direction = "asc";

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);


        //Pageable pageable = new ProblemPageRequest(limit, offset, sort);
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit, sort);

        Page<Problem> problemPage;

        if (title != null && !title.isBlank()) {
            problemPage = problemRepository.findByTitleContainingIgnoreCase(title, pageable);
        }
        else {
            problemPage = problemRepository.findAll(pageable);
        }

        Page<ProblemDTO> pageDTO = problemPage.map(this::mapToResponseDTO);

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problems retrieved successfully")
                .data(pageDTO)
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemDTO> getProblemBySlug(String slug) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        ProblemDTO problemDTO = mapToResponseDTO(problem);

        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(problemDTO)
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemDTO> getProblemById(Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        ProblemDTO problemDTO = mapToResponseDTO(problem);

        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(problemDTO)
                .build();
    }

    @Override
    public Response<ProblemDTO> createProblem(ProblemDTO problemDTO) {
        try {
            // Validate required fields
            if (problemDTO.getStatementFile() == null || problemDTO.getStatementFile().isEmpty()) {
                throw new IllegalArgumentException("Problem statement file is required");
            }

            if (problemDTO.getTestCases() == null || problemDTO.getTestCases().isEmpty()) {
                throw new IllegalArgumentException("At least one test case is required");
            }

            // Check if problem title already exists
            if (problemRepository.existsByTitle(problemDTO.getTitle())) {
                throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
            }

            String baseSlug = ProblemSlugUtils.generateSlug(problemDTO.getTitle());
            String uniqueSlug = generateUniqueSlug(baseSlug);

            User author = userRepository.findById(problemDTO.getAuthorId())
                    .orElseThrow(() -> new NotFoundException("Author not found with id: " + problemDTO.getAuthorId()));

            // Create Problem entity
            Problem problem = Problem.builder()
                    .title(problemDTO.getTitle())
                    .slug(uniqueSlug)
                    .point(problemDTO.getPoint())
                    .timeLimit(problemDTO.getTimeLimit())
                    .memoryLimit(problemDTO.getMemoryLimit())
                    .author(author)
                    .problemDifficulty(problemDTO.getProblemDifficulty())
                    .testCases(new ArrayList<>())
                    .build();

            // Save problem first to get ID (needed for S3 folder structure)
            problem = problemRepository.save(problem);

            // Create base folder name: problemId-problemTitle (sanitize title for S3)
            String sanitizedTitle = problemDTO.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")  // Replace special chars with hyphen
                    .replaceAll("-+", "-")               // Replace multiple hyphens with single
                    .toLowerCase();
            String basePath = String.format("problems/%d-%s", problem.getId(), sanitizedTitle);

            // Upload problem statement file to S3
            String statementKey = String.format("%s/statement.md", basePath);
            URL statementUrl = awsS3Service.uploadFile(statementKey, problemDTO.getStatementFile());
            problem.setStatementFileUrl(statementUrl.toString());

            // Process and upload test cases
            List<TestCase> testCases = new ArrayList<>();
            int testCaseIndex = 0;

            for (TestCaseDTO testCaseDTO : problemDTO.getTestCases()) {
                // Validate test case files
                if (testCaseDTO.getInputFile() == null || testCaseDTO.getInputFile().isEmpty()) {
                    throw new IllegalArgumentException("Input file is required for test case " + testCaseIndex);
                }
                if (testCaseDTO.getExpectedOutputFile() == null || testCaseDTO.getExpectedOutputFile().isEmpty()) {
                    throw new IllegalArgumentException("Expected output file is required for test case " + testCaseIndex);
                }

                // Upload input file
                String inputKey = String.format("%s/testcases/inputs/%d.txt", basePath, testCaseIndex);
                URL inputUrl = awsS3Service.uploadFile(inputKey, testCaseDTO.getInputFile());

                // Upload expected output file
                String outputKey = String.format("%s/testcases/outputs/%d.txt", basePath, testCaseIndex);
                URL outputUrl = awsS3Service.uploadFile(outputKey, testCaseDTO.getExpectedOutputFile());

                // Create TestCase entity
                TestCase testCase = TestCase.builder()
                        .inputFileUrl(inputUrl.toString())
                        .expectedOutputFileUrl(outputUrl.toString())
                        .problem(problem)
                        .build();

                testCases.add(testCase);
                testCaseIndex++;
            }

            testCaseRepository.saveAll(testCases);
            problem.setTestCases(testCases);

            problem.setCreatedAt(LocalDateTime.now());
            problem = problemRepository.save(problem);

            // Map to DTO for response
            ProblemDTO responseProblemDTO = mapToResponseDTO(problem);

            return Response.<ProblemDTO>builder()
                    .statusCode(HttpStatus.CREATED.value())
                    .message("Problem created successfully")
                    .data(responseProblemDTO)
                    .build();
        }
        catch (IllegalArgumentException ex) {
            log.error("Validation error while creating problem: {}", ex.getMessage());
            throw ex;
        }
        catch (Exception ex) {
            log.error("Error creating problem: {}", ex.getMessage(), ex);
            // Rollback will happen automatically due to @Transactional
            throw new RuntimeException("Failed to create problem: " + ex.getMessage(), ex);
        }
    }

    @Override
    public Response<ProblemDTO> updateProblem(ProblemDTO problemDTO) {
        log.info(problemDTO.toString());

        try {
            // Find existing problem
            Problem problem = problemRepository.findById(problemDTO.getId())
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemDTO.getId()));

            // Check if title is being changed and if new title already exists
            if (!problem.getTitle().equals(problemDTO.getTitle())) {
                if (problemRepository.existsByTitle(problemDTO.getTitle())) {
                    throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
                }
            }

            // Store old sanitized title for potential S3 path change
            String oldSanitizedTitle = problem.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String oldBasePath = String.format("problems/%d-%s", problem.getId(), oldSanitizedTitle);

            // Update basic problem properties
            if (!problem.getTitle().equals(problemDTO.getTitle())) {
                String baseSlug = ProblemSlugUtils.generateSlug(problemDTO.getTitle());
                String uniqueSlug = generateUniqueSlugExcludingCurrent(baseSlug, problemDTO.getId());
                problem.setSlug(uniqueSlug);
            }
            problem.setTitle(problemDTO.getTitle());
            problem.setPoint(problemDTO.getPoint());
            problem.setTimeLimit(problemDTO.getTimeLimit());
            problem.setMemoryLimit(problemDTO.getMemoryLimit());

            // Create new base path with updated title
            String newSanitizedTitle = problemDTO.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String newBasePath = String.format("problems/%d-%s", problem.getId(), newSanitizedTitle);

            boolean pathChanged = !oldBasePath.equals(newBasePath);

            // Update statement file if provided
            if (problemDTO.getStatementFile() != null && !problemDTO.getStatementFile().isEmpty()) {
                // Delete old statement file from S3
                if (problem.getStatementFileUrl() != null) {
                    try {
                        String oldKey = extractS3KeyFromUrl(problem.getStatementFileUrl());
                        awsS3Service.deleteFile(oldKey);
                        log.info("Deleted old statement file: {}", oldKey);
                    } catch (Exception e) {
                        log.warn("Failed to delete old statement file: {}", e.getMessage());
                    }
                }

                // Upload new statement file
                String statementKey = String.format("%s/statement.md", newBasePath);
                URL statementUrl = awsS3Service.uploadFile(statementKey, problemDTO.getStatementFile());
                problem.setStatementFileUrl(statementUrl.toString());
                log.info("Uploaded new statement file to: {}", statementKey);

            } else if (pathChanged && problem.getStatementFileUrl() != null) {
                // If title changed but no new file provided, move existing file
                try {
                    String oldKey = extractS3KeyFromUrl(problem.getStatementFileUrl());
                    String newKey = String.format("%s/statement.md", newBasePath);
                    awsS3Service.moveFile(oldKey, newKey);
                    problem.setStatementFileUrl(awsS3Service.getFileUrl(newKey).toString());
                    log.info("Moved statement file from {} to {}", oldKey, newKey);
                } catch (Exception e) {
                    log.error("Failed to move statement file: {}", e.getMessage());
                    throw new RuntimeException("Failed to move statement file: " + e.getMessage());
                }
            }

            // Handle test cases update
            if (problemDTO.getTestCases() != null && !problemDTO.getTestCases().isEmpty()) {
                // Load existing test cases from DB
                List<TestCase> existingTestCases = testCaseRepository.findTestCasesByProblemId(problem.getId());

                // Map for quick lookup
                Map<Long, TestCase> existingMap = existingTestCases.stream()
                        .collect(Collectors.toMap(TestCase::getId, tc -> tc));

                List<TestCase> updatedTestCases = new ArrayList<>();

                int index = 0;
                for (TestCaseDTO testCaseDTO : problemDTO.getTestCases()) {

                    TestCase testCase;
                    if (testCaseDTO.getId() != null && existingMap.containsKey(testCaseDTO.getId())) {
                        // Update existing
                        testCase = existingMap.get(testCaseDTO.getId());

                        // Delete old files if new ones are provided
                        if (testCaseDTO.getInputFile() != null && !testCaseDTO.getInputFile().isEmpty()) {
                            if (testCase.getInputFileUrl() != null) {
                                awsS3Service.deleteFile(extractS3KeyFromUrl(testCase.getInputFileUrl()));
                            }
                            String inputKey = String.format("%s/testcases/inputs/%d.txt", newBasePath, index);
                            URL inputUrl = awsS3Service.uploadFile(inputKey, testCaseDTO.getInputFile());
                            testCase.setInputFileUrl(inputUrl.toString());
                        }

                        if (testCaseDTO.getExpectedOutputFile() != null && !testCaseDTO.getExpectedOutputFile().isEmpty()) {
                            if (testCase.getExpectedOutputFileUrl() != null) {
                                awsS3Service.deleteFile(extractS3KeyFromUrl(testCase.getExpectedOutputFileUrl()));
                            }
                            String outputKey = String.format("%s/testcases/outputs/%d.txt", newBasePath, index);
                            URL outputUrl = awsS3Service.uploadFile(outputKey, testCaseDTO.getExpectedOutputFile());
                            testCase.setExpectedOutputFileUrl(outputUrl.toString());
                        }

                        existingMap.remove(testCaseDTO.getId()); // Mark as processed
                    } else {
                        // New testcase
                        String inputKey = String.format("%s/testcases/inputs/%d.txt", newBasePath, index);
                        URL inputUrl = awsS3Service.uploadFile(inputKey, testCaseDTO.getInputFile());

                        String outputKey = String.format("%s/testcases/outputs/%d.txt", newBasePath, index);
                        URL outputUrl = awsS3Service.uploadFile(outputKey, testCaseDTO.getExpectedOutputFile());

                        testCase = TestCase.builder()
                                .inputFileUrl(inputUrl.toString())
                                .expectedOutputFileUrl(outputUrl.toString())
                                .problem(problem)
                                .build();
                    }

                    updatedTestCases.add(testCase);
                    index++;
                }

                // Any leftover testcases in existingMap were not in DTO → delete them
                for (TestCase toRemove : existingMap.values()) {
                    if (toRemove.getInputFileUrl() != null) {
                        awsS3Service.deleteFile(extractS3KeyFromUrl(toRemove.getInputFileUrl()));
                    }
                    if (toRemove.getExpectedOutputFileUrl() != null) {
                        awsS3Service.deleteFile(extractS3KeyFromUrl(toRemove.getExpectedOutputFileUrl()));
                    }
                    testCaseRepository.delete(toRemove);
                }

                // Save new + updated testcases
                testCaseRepository.saveAll(updatedTestCases);
                problem.setTestCases(updatedTestCases);

                log.info("Problem {} testcases updated: {} kept/updated, {} removed",
                        problem.getId(), updatedTestCases.size(), existingMap.size());
            }

            // If title changed, clean up old directory structure
            if (pathChanged) {
                try {
                    awsS3Service.deleteFolder(oldBasePath);
                    log.info("Deleted old folder structure: {}", oldBasePath);
                } catch (Exception e) {
                    log.warn("Failed to delete old folder structure {}: {}", oldBasePath, e.getMessage());
                    // Don't fail the whole operation if cleanup fails
                }
            }

            // Update author if provided
            if (problemDTO.getAuthorId() != null) {
                User author = userRepository.findById(problemDTO.getAuthorId())
                        .orElseThrow(() -> new NotFoundException("Author not found with id: " + problemDTO.getAuthorId()));
                problem.setAuthor(author);
            }

            // Update difficulty if provided
            if (problemDTO.getProblemDifficulty() != null) {
                problem.setProblemDifficulty(problemDTO.getProblemDifficulty());
            }

            // Save updated problem
            problem.setUpdatedAt(LocalDateTime.now());
            problem = problemRepository.save(problem);

            // Map to DTO for response
            ProblemDTO responseProblemDTO = mapToResponseDTO(problem);

            return Response.<ProblemDTO>builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("Problem updated successfully")
                    .data(responseProblemDTO)
                    .build();
        }
        catch (IllegalArgumentException ex) {
            log.error("Validation error while updating problem: {}", ex.getMessage());
            throw ex;
        }
        catch (NotFoundException ex) {
            log.error("Problem not found: {}", ex.getMessage());
            throw ex;
        }
        catch (Exception ex) {
            log.error("Error updating problem: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to update problem: " + ex.getMessage(), ex);
        }
    }

    @Override
    @Transactional
    public Response<?> deleteProblem(Long id) {
        try {
            // Find the problem
            Problem problem = problemRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + id));

            log.info("Deleting problem: {} (ID: {})", problem.getTitle(), id);

            // Create sanitized title for S3 path
            String sanitizedTitle = problem.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String basePath = String.format("problems/%d-%s", problem.getId(), sanitizedTitle);

            // Delete all test case files from S3
            List<TestCase> testCases = problem.getTestCases();
            if (testCases != null && !testCases.isEmpty()) {
                log.info("Deleting {} test case files from S3", testCases.size());

                for (TestCase testCase : testCases) {
                    try {
                        // Delete input file
                        if (testCase.getInputFileUrl() != null) {
                            String inputKey = extractS3KeyFromUrl(testCase.getInputFileUrl());
                            awsS3Service.deleteFile(inputKey);
                            log.info("Deleted input file: {}", inputKey);
                        }

                        // Delete expected output file
                        if (testCase.getExpectedOutputFileUrl() != null) {
                            String outputKey = extractS3KeyFromUrl(testCase.getExpectedOutputFileUrl());
                            awsS3Service.deleteFile(outputKey);
                            log.info("Deleted output file: {}", outputKey);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to delete test case files for test case ID {}: {}",
                                testCase.getId(), e.getMessage());
                        // Continue with deletion even if some files fail
                    }
                }
            }

            // Delete statement file from S3
            if (problem.getStatementFileUrl() != null) {
                try {
                    String statementKey = extractS3KeyFromUrl(problem.getStatementFileUrl());
                    awsS3Service.deleteFile(statementKey);
                    log.info("Deleted statement file: {}", statementKey);
                } catch (Exception e) {
                    log.warn("Failed to delete statement file: {}", e.getMessage());
                }
            }

            // Delete entire problem folder from S3 (cleanup any remaining files)
            try {
                awsS3Service.deleteFolder(basePath);
                log.info("Deleted problem folder: {}", basePath);
            } catch (Exception e) {
                log.warn("Failed to delete problem folder '{}': {}", basePath, e.getMessage());
                // Continue with database deletion even if S3 cleanup fails
            }

            // Delete test cases from database (cascade should handle this, but explicit is safer)
            if (testCases != null && !testCases.isEmpty()) {
                testCaseRepository.deleteAll(testCases);
                log.info("Deleted {} test cases from database", testCases.size());
            }

            // Delete problem from database
            problemRepository.delete(problem);
            log.info("Problem {} deleted successfully from database", id);

            return Response.builder()
                    .statusCode(HttpStatus.OK.value())
                    .message("Problem deleted successfully")
                    .build();

        } catch (NotFoundException ex) {
            log.error("Problem not found: {}", ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            log.error("Error deleting problem: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to delete problem: " + ex.getMessage(), ex);
        }
    }

    private String extractS3KeyFromUrl(String url) {
        try {
            URL s3Url = new URL(url);
            String key = s3Url.getPath();
            return key.startsWith("/") ? key.substring(1) : key;
        } catch (Exception e) {
            throw new RuntimeException("Invalid S3 URL: " + url, e);
        }
    }

    private String generateUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 1;

        while (problemRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }

        return slug;
    }

    private String generateUniqueSlugExcludingCurrent(String baseSlug, Long excludeId) {
        String slug = baseSlug;
        int counter = 1;

        while (problemRepository.existsBySlugAndIdNot(slug, excludeId)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }

        return slug;
    }

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

        // Map test cases
        if (problem.getTestCases() != null) {
            List<TestCaseDTO> testCaseDTOs = problem.getTestCases().stream()
                    .map(this::mapTestCaseToDTO)
                    .collect(Collectors.toList());
            dto.setTestCases(testCaseDTOs);
        }

        // Map tags
        if (problem.getTags() != null) {
            Set<TagDTO> tagDTOs = problem.getTags().stream()
                    .map(tag -> {
                        TagDTO tagDTO = new TagDTO();
                        tagDTO.setId(tag.getId());
                        tagDTO.setName(tag.getName());
                        return tagDTO;
                    })
                    .collect(Collectors.toSet());
            dto.setTags(tagDTOs);
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
