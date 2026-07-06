package com.oj.TDTUOJ.testcase.entity;

import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * JPA entity for one judging test case belonging to a {@link Problem}.
 *
 * <p>Input and expected-output payloads are not stored in the DB — only their S3 URLs are;
 * the actual data is streamed from S3 at judge time. {@code isSample} marks cases shown to
 * users on the problem page vs. hidden cases used only for grading. The per-case
 * {@code timeLimit}/{@code memoryLimit}/{@code points} allow overriding the problem defaults.</p>
 */
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
    private Boolean isSample = false;

    private Double timeLimit;  // in seconds

    private Integer memoryLimit; // in KB

    private Integer points;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;
}
