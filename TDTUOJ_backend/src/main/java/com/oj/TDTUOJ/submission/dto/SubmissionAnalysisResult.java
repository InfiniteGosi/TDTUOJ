package com.oj.TDTUOJ.submission.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * LeetCode-style AI analysis of an Accepted submission. Serialized to JSON and cached
 * on {@code submissions.analysis}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionAnalysisResult {

    /** One-line congratulatory / topical summary. */
    private String summary;

    private Approach approach;
    private Efficiency efficiency;

    /** Free-form code-style feedback. */
    private String codeStyle;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Approach {
        /** Techniques/data structures the submitted code uses. */
        private List<String> current;
        /** Optionally better techniques for the problem. */
        private List<String> suggested;
        private String keyIdea;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Efficiency {
        /** Free-form display, e.g. "O(N log N)". */
        private String currentComplexity;
        private String suggestedComplexity;
        /** Canonical class for graph plotting — one of the fixed set. */
        private String complexityClass;
        private String suggestions;
    }
}
