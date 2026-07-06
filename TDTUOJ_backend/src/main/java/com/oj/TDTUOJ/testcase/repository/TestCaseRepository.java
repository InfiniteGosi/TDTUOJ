package com.oj.TDTUOJ.testcase.repository;

import com.oj.TDTUOJ.testcase.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Data-access for {@link TestCase}. */
@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    /** All test cases attached to a given problem (used by judging and problem update reconciliation). */
    List<TestCase> findTestCasesByProblemId(Long problemId);
}
