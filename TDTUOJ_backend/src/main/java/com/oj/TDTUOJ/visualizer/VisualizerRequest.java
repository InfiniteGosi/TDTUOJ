package com.oj.TDTUOJ.visualizer;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import lombok.Data;

/**
 * Request payload for {@code POST /api/visualize}: the user code to instrument
 * and trace, its language (selects the matching {@code Tracer}), and optional
 * stdin fed to the program during execution on Judge0.
 */
@Data
public class VisualizerRequest {
    /** Raw user source to be rewritten by a language-specific tracer. */
    private String sourceCode;
    /** Language of {@link #sourceCode}; drives tracer + Judge0 language-id selection. */
    private SubmissionLanguage language;
    private String stdin;       // optional — test case input
}
