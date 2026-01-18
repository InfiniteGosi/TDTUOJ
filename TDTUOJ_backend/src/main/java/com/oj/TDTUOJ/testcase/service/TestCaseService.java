package com.oj.TDTUOJ.testcase.service;

import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;


public interface TestCaseService {
    Response<List<TestCaseDTO>> getAllTestCases();
    Response<TestCaseDTO> getTestCaseById(Long id);
    Response<TestCaseDTO> createTestCase(TestCaseDTO testCaseDTO);
    Response<TestCaseDTO> updateTestCase(TestCaseDTO testCaseDTO);
    Response<?> deleteTestCase(Long id);
}
