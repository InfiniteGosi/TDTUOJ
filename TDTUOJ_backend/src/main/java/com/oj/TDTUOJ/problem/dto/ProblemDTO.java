package com.oj.TDTUOJ.problem.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Request/response DTO for problems. Doubles as a multipart form-backing object on
 * create/update ({@code statementFile}) and carries computed, per-viewer fields
 * ({@code solved}/{@code attempted}) plus lecturer-only usage badges. {@code NON_NULL}
 * inclusion keeps optional fields (e.g. usage badges) off responses where they don't apply.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemDTO {
    private Long id;

    private String title;

    private String slug;

    private Boolean isPublic;

    private Long authorId;

    private String authorUserName;

    private ProblemDifficulty problemDifficulty;

    private String statementFileUrl; // S3 URL to problem statement (.md file)

    private Integer point;

    private String solutionCode;

    private String solutionLanguage;

    private Double timeLimit;  // in seconds

    private Integer memoryLimit; // in KB

    private Boolean solved;

    private Boolean attempted;

    // Usage badges (populated only on the My Problems listing)
    private Boolean usedInContest;

    private Boolean usedInLab;

    private List<TestCaseDTO> testCases;

    private Set<TagDTO> tags;

    private List<String> tagNames;

    private MultipartFile statementFile;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
