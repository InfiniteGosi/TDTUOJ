package com.oj.TDTUOJ.problem.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemDTO {
    private Long id;

    private String title;

    private String statementFileUrl; // S3 URL to problem statement (.md file)

    private Integer point;

    private Double timeLimit;  // in seconds

    private Integer memoryLimit; // in KB

    private List<TestCaseDTO> testCases;

    private MultipartFile statementFile;
}
