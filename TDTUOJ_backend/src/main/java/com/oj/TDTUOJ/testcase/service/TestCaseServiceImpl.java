package com.oj.TDTUOJ.testcase.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestCaseServiceImpl implements TestCaseService {
    private final TestCaseRepository testCaseRepository;
    private final ProblemRepository problemRepository;
    private final ModelMapper modelMapper;
    private final AwsS3Service awsS3Service;

    @Override
    public Response<List<TestCaseDTO>> getAllTestCases() {
        List<TestCase> testCases = testCaseRepository.findAll();

        List<TestCaseDTO> testCaseDTOS = testCases.stream()
                .map(testCase -> modelMapper.map(testCase, TestCaseDTO.class))
                .toList();

        return Response.<List<TestCaseDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Test cases retrieved successfully")
                .data(testCaseDTOS)
                .build();
    }

    @Override
    public Response<TestCaseDTO> getTestCaseById(Long id) {
        TestCase testCase = testCaseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Test case not found"));

        TestCaseDTO testCaseDTO = modelMapper.map(testCase, TestCaseDTO.class);

        return Response.<TestCaseDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Test case retrieved successfully")
                .data(testCaseDTO)
                .build();
    }

    /**
     * NOTE: incomplete/stub. It validates the problem and files and computes the S3 keys
     * but returns {@code null} without persisting — creation is handled by
     * {@code ProblemServiceImpl.createProblem/updateProblem} in practice.
     */
    @Override
    public Response<TestCaseDTO> createTestCase(TestCaseDTO testCaseDTO) {
        // Ensures problem exists
        Problem problem = problemRepository.findById(testCaseDTO.getProblemId())
                .orElseThrow(() -> new NotFoundException("Problem not found"));

        MultipartFile inputFile = testCaseDTO.getInputFile();
        MultipartFile expectedOutPutFile = testCaseDTO.getExpectedOutputFile();

        if (inputFile == null || inputFile.isEmpty()) {
            throw new BadRequestException("Input file required");
        }

        if (expectedOutPutFile == null || expectedOutPutFile.isEmpty()) {
            throw new BadRequestException("Input file required");
        }

        // Build structured S3 key names
        String basePath = buildBasePath(problem.getId(), problem.getTitle());

        String inputKey = basePath + "input/" + testCaseDTO.getInputFile().getOriginalFilename();
        String outputKey = basePath + "output/" + testCaseDTO.getExpectedOutputFile().getOriginalFilename();

        log.info(inputKey);
        log.info(outputKey);

        return null;
    }

    /** Not implemented — test-case updates go through {@code ProblemServiceImpl.updateProblem}. */
    @Override
    public Response<TestCaseDTO> updateTestCase(TestCaseDTO testCaseDTO) {
        return null;
    }

    /** Not implemented — orphan test cases are pruned during {@code ProblemServiceImpl.updateProblem}. */
    @Override
    public Response<?> deleteTestCase(Long id) {
        return null;
    }

    /** Builds the S3 key prefix ({@code problems/{id}-{safeName}/testcases/}) for a problem's test-case files. */
    private String buildBasePath(Long problemId, String problemName) {
        // Sanitize the problem name for use in S3 (no spaces, special chars)
        String safeName = problemName
                .trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")   // replace invalid chars with hyphen
                .replaceAll("-{2,}", "-");         // collapse multiple hyphens

        return String.format("problems/%d-%s/testcases/", problemId, safeName);
    }

}
