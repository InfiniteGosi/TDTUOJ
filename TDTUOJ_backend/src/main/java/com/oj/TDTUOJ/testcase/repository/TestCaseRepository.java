package com.oj.TDTUOJ.testcase.repository;

import com.oj.TDTUOJ.testcase.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    List<TestCase> findTestCasesByProblemId(Long problemId);
}
