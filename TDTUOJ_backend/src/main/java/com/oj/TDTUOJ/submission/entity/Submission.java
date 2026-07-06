package com.oj.TDTUOJ.submission.entity;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Persisted record of one code submission and its judged outcome.
 *
 * <p>Its lifecycle mirrors the judging flow: created PENDING at submit time, moved to RUNNING
 * when the worker starts, then COMPLETED once a {@link SubmissionVerdict} is resolved. A
 * submission may belong to a practice attempt (contestId/labId null), a contest, or a lab; the
 * problem is a lazy association while user/contest/lab are stored as raw ids to keep the row light.
 */
@Entity
@Data
@Table(name = "submissions")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String sourceCode;

    private Double memoryUsed;

    private Integer executionTime;

    @Enumerated(EnumType.STRING)
    private SubmissionStatus submissionStatus;

    @Enumerated(EnumType.STRING)
    private SubmissionVerdict submissionVerdict;

    @Enumerated(EnumType.STRING)
    private SubmissionLanguage submissionLanguage;

    private LocalDateTime submissionDate;

    private Integer testCasesPassed;

    private Integer totalTestCases;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(columnDefinition = "TEXT")
    private String analysis; // cached LeetCode-style AI analysis (JSON), populated on demand

    private Boolean isPublic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problemId")
    private Problem problem;

    private Long userId;

    private Long contestId;

    private Long labId;
}
