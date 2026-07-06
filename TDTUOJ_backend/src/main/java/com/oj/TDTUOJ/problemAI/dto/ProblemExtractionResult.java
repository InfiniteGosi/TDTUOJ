package com.oj.TDTUOJ.problemAI.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Structured problem data parsed from the Gemini extraction response.
 *
 * <p>Deserialized directly from the model's JSON output, so {@code @JsonIgnoreProperties}
 * tolerates any extra fields the model may emit. {@code testCasesGenerated} distinguishes
 * cases lifted from the PDF (false) from cases the AI synthesized when the PDF had none (true).</p>
 */
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

    /** A single input/expected-output pair. {@code isSample} marks cases shown to users vs. hidden judging cases. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExtractedTestCase {
        private String input;
        private String expectedOutput;
        // Explicit @JsonProperty: the boolean getter would otherwise serialize as "sample", not "isSample".
        @JsonProperty("isSample")
        private boolean isSample;
    }
}
