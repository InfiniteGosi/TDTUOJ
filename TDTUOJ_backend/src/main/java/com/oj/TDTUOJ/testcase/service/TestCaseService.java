package com.oj.TDTUOJ.testcase.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;

import java.util.List;


public interface TestCaseService {
    Response<List<TestCaseDTO>> getAllTestCases();
    Response<TestCaseDTO> getTestCaseById(Long id);
    Response<TestCaseDTO> createTestCase(TestCaseDTO testCaseDTO);
    Response<TestCaseDTO> updateTestCase(TestCaseDTO testCaseDTO);
    Response<?> deleteTestCase(Long id);
}
