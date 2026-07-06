package com.oj.TDTUOJ.testcase.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;

import java.util.List;


/**
 * Standalone test-case management. Note that most test-case lifecycle actually happens
 * inside {@code ProblemServiceImpl} (create/update problem); the write methods here are
 * only partially implemented (see {@code TestCaseServiceImpl}).
 */
public interface TestCaseService {
    Response<List<TestCaseDTO>> getAllTestCases();
    Response<TestCaseDTO> getTestCaseById(Long id);
    Response<TestCaseDTO> createTestCase(TestCaseDTO testCaseDTO);
    Response<TestCaseDTO> updateTestCase(TestCaseDTO testCaseDTO);
    Response<?> deleteTestCase(Long id);
}
