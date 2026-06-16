package com.oj.TDTUOJ.visualizer.service.classifier;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Fallback classifier. The LLM-backed implementation is marked
 * {@code @Primary}; this bean keeps the visualizer functional when
 * that one is disabled.
 */
@Component
public class NoopVariableClassifier implements VariableClassifier {

    @Override
    public CompletableFuture<Map<String, Object>> classify(String sourceCode, SubmissionLanguage language) {
        return CompletableFuture.completedFuture(Collections.emptyMap());
    }
}
