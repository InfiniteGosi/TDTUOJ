package com.oj.TDTUOJ.testcase.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

/**
 * Request/response DTO for test cases. On write it doubles as a multipart form object:
 * {@code inputFile}/{@code expectedOutputFile} carry the uploaded content, while the
 * {@code *FileUrl} fields carry the stored S3 locations back on read.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class TestCaseDTO {
    private Long id;

    private String inputFileUrl;         // e.g. https://s3.amazonaws.com/problems/1/testcases/input/1.txt

    private String expectedOutputFileUrl; // e.g. https://s3.amazonaws.com/problems/1/testcases/output/1.txt

    private Boolean isSample;

    private Double timeLimit;  // in seconds

    private Integer memoryLimit; // in KB

    private Integer points;

    @NotNull(message = "Problem ID is required")
    private Long problemId;

    private MultipartFile inputFile;

    private MultipartFile expectedOutputFile;
}
