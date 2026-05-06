package com.oj.TDTUOJ.problemAI.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemExtractionResult {
    private String title;
    private String statement;           // Markdown-formatted
    private String difficulty;          // EASY | MEDIUM | HARD
    private Double timeLimit;           // seconds
    private Integer memoryLimit;        // MB
    private Integer point;
    private List<ExtractedTestCase> testCases;
    private boolean testCasesGenerated; // true = AI-generated, false = from PDF
    private List<String> suggestedTags; // tag names matching available tags

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtractedTestCase {
        private String input;
        private String expectedOutput;
        @JsonProperty("isSample")
        private boolean isSample;
    }
}
