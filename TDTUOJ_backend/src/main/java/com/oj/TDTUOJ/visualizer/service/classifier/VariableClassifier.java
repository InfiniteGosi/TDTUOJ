package com.oj.TDTUOJ.visualizer.service.classifier;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Classifies the semantic role of variables in user source code
 * (graph vs DP table vs tree …) to assist the frontend's heuristic
 * shape inference.
 *
 * <p>Contract: NEVER blocks or breaks a visualization run. Implementations
 * must complete the future exceptionally or with an empty map on any failure;
 * the caller applies a hard time budget and falls back to an empty map.
 */
public interface VariableClassifier {

    /**
     * @return future of {variableName → {role, form, directed, confidence}};
     *         empty map when classification is unavailable.
     */
    CompletableFuture<Map<String, Object>> classify(String sourceCode, SubmissionLanguage language);
}
