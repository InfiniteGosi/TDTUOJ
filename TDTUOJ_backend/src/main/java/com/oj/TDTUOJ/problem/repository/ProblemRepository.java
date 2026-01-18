package com.oj.TDTUOJ.problem.repository;

import com.oj.TDTUOJ.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Page<Problem> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    Boolean existsByTitle(String title);
}
