package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.aws.AwsS3Service;
import com.oj.TDTUOJ.exceptions.NotFoundException;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProblemServiceImpl implements ProblemService {
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
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

        Page<ProblemDTO> pageDTO = problemPage.map(problem -> modelMapper.map(problem, ProblemDTO.class));

        return Response.<Page<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problems retrieved successfully")
                .data(pageDTO)
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemDTO> getProblemById(Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        ProblemDTO problemDTO = modelMapper.map(problem, ProblemDTO.class);


        return Response.<ProblemDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Problem retrieved successfully")
                .data(problemDTO)
                .build();
    }

    @Override
    public Response<ProblemDTO> createProblem(ProblemDTO problemDTO) {
        try {
            // 1. Validate required fields
            if (problemDTO.getStatementFile() == null || problemDTO.getStatementFile().isEmpty()) {
                throw new IllegalArgumentException("Problem statement file is required");
            }

            if (problemDTO.getTestCases() == null || problemDTO.getTestCases().isEmpty()) {
                throw new IllegalArgumentException("At least one test case is required");
            }

            // 2. Check if problem title already exists
            if (problemRepository.existsByTitle(problemDTO.getTitle())) {
                throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
            }

            // 3. Create Problem entity
            Problem problem = Problem.builder()
                    .title(problemDTO.getTitle())
                    .point(problemDTO.getPoint())
                    .timeLimit(problemDTO.getTimeLimit())
                    .memoryLimit(problemDTO.getMemoryLimit())
                    .testCases(new ArrayList<>())
                    .build();

            // 4. Save problem first to get ID (needed for S3 folder structure)
            problem = problemRepository.save(problem);

            // 5. Create base folder name: problemId-problemTitle (sanitize title for S3)
            String sanitizedTitle = problemDTO.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")  // Replace special chars with hyphen
                    .replaceAll("-+", "-")               // Replace multiple hyphens with single
                    .toLowerCase();
            String basePath = String.format("problems/%d-%s", problem.getId(), sanitizedTitle);

            // 6. Upload problem statement file to S3
            String statementKey = String.format("%s/statement.md", basePath);
            URL statementUrl = awsS3Service.uploadFile(statementKey, problemDTO.getStatementFile());
            problem.setStatementFileUrl(statementUrl.toString());


            // 7. Process and upload test cases
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

            problem = problemRepository.save(problem);

            // 9. Map to DTO for response
            ProblemDTO responseProblemDTO = modelMapper.map(problem, ProblemDTO.class);

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
        try {
            // 1. Find existing problem
            Problem problem = problemRepository.findById(problemDTO.getId())
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemDTO.getId()));

            // 2. Check if title is being changed and if new title already exists
            if (!problem.getTitle().equals(problemDTO.getTitle())) {
                if (problemRepository.existsByTitle(problemDTO.getTitle())) {
                    throw new IllegalArgumentException("Problem with title '" + problemDTO.getTitle() + "' already exists");
                }
            }

            // 3. Store old sanitized title for potential S3 path change
            String oldSanitizedTitle = problem.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String oldBasePath = String.format("problems/%d-%s", problem.getId(), oldSanitizedTitle);

            // 4. Update basic problem properties
            problem.setTitle(problemDTO.getTitle());
            problem.setPoint(problemDTO.getPoint());
            problem.setTimeLimit(problemDTO.getTimeLimit());
            problem.setMemoryLimit(problemDTO.getMemoryLimit());

            // 5. Create new base path with updated title
            String newSanitizedTitle = problemDTO.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String newBasePath = String.format("problems/%d-%s", problem.getId(), newSanitizedTitle);

            boolean pathChanged = !oldBasePath.equals(newBasePath);

            // 6. Update statement file if provided
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

            // 7. Handle test cases update
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

            // 8. If title changed, clean up old directory structure
            if (pathChanged) {
                try {
                    awsS3Service.deleteFolder(oldBasePath);
                    log.info("Deleted old folder structure: {}", oldBasePath);
                } catch (Exception e) {
                    log.warn("Failed to delete old folder structure {}: {}", oldBasePath, e.getMessage());
                    // Don't fail the whole operation if cleanup fails
                }
            }

            // 9. Save updated problem
            problem = problemRepository.save(problem);
            log.info("Problem {} updated successfully", problem.getId());

            // 10. Map to DTO for response
            ProblemDTO responseProblemDTO = modelMapper.map(problem, ProblemDTO.class);

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
            // 1. Find the problem
            Problem problem = problemRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Problem not found with id: " + id));

            log.info("Deleting problem: {} (ID: {})", problem.getTitle(), id);

            // 2. Create sanitized title for S3 path
            String sanitizedTitle = problem.getTitle()
                    .replaceAll("[^a-zA-Z0-9-_]", "-")
                    .replaceAll("-+", "-")
                    .toLowerCase();
            String basePath = String.format("problems/%d-%s", problem.getId(), sanitizedTitle);

            // 3. Delete all test case files from S3
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

            // 4. Delete statement file from S3
            if (problem.getStatementFileUrl() != null) {
                try {
                    String statementKey = extractS3KeyFromUrl(problem.getStatementFileUrl());
                    awsS3Service.deleteFile(statementKey);
                    log.info("Deleted statement file: {}", statementKey);
                } catch (Exception e) {
                    log.warn("Failed to delete statement file: {}", e.getMessage());
                }
            }

            // 5. Delete entire problem folder from S3 (cleanup any remaining files)
            try {
                awsS3Service.deleteFolder(basePath);
                log.info("Deleted problem folder: {}", basePath);
            } catch (Exception e) {
                log.warn("Failed to delete problem folder '{}': {}", basePath, e.getMessage());
                // Continue with database deletion even if S3 cleanup fails
            }

            // 6. Delete test cases from database (cascade should handle this, but explicit is safer)
            if (testCases != null && !testCases.isEmpty()) {
                testCaseRepository.deleteAll(testCases);
                log.info("Deleted {} test cases from database", testCases.size());
            }

            // 7. Delete problem from database
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
            // Handle different S3 URL formats:
            // 1. Virtual-hosted style: https://bucket-name.s3.region.amazonaws.com/key
            // 2. Path style: https://s3.region.amazonaws.com/bucket-name/key
            // 3. S3 console URL: https://bucket-name.s3.amazonaws.com/key

            URL s3Url = new URL(url);
            String path = s3Url.getPath();

            // Remove leading slash if present
            String key = path.startsWith("/") ? path.substring(1) : path;

            // If the key starts with bucket name (path-style), remove it
            // This is a simplified approach - adjust based on your actual S3 URL format
            if (key.contains("/")) {
                String[] parts = key.split("/", 2);
                // If first part looks like a bucket name and there's more path
                if (parts.length > 1 && !parts[0].contains(".")) {
                    return parts[1]; // Return the actual key without bucket name
                }
            }

            return key;
        } catch (Exception e) {
            log.error("Failed to extract S3 key from URL: {}", url, e);
            // Fallback: try to extract just the path after the domain
            int lastSlashIndex = url.lastIndexOf('/');
            if (lastSlashIndex != -1 && lastSlashIndex < url.length() - 1) {
                return url.substring(url.indexOf('/', 8)); // Skip protocol https://
            }
            return url; // Last resort fallback
        }
    }
}
