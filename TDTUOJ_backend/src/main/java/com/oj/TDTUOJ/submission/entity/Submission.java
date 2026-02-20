package com.oj.TDTUOJ.submission.entity;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    private String sourceCode;

    private Double memoryUsed;

    private Integer executionTime;

    private SubmissionStatus submissionStatus;

    private SubmissionVerdict submissionVerdict;

    private SubmissionLanguage submissionLanguage;

    private LocalDateTime submissionDate;

    private Integer testCasesPassed;

    private Integer totalTestCases;

    private String errorMessage;

    private Boolean isPublic;

    private Long problemId;

    private Long userId;

    private Long contestId;
}
