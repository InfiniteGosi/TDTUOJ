package com.oj.TDTUOJ.testcase.entity;

import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@Table(name = "test_cases")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TestCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String inputFileUrl;

    private String expectedOutputFileUrl;

    @Builder.Default
    private boolean isSample = false;

    private Double timeLimit;  // in seconds

    private Integer memoryLimit; // in KB

    private Integer points;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;
}
