package com.oj.TDTUOJ.visualizer;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.VisualizerMode;
import lombok.Data;

@Data
public class VisualizerRequest {
    private String sourceCode;
    private SubmissionLanguage language;
    private String stdin;       // optional — test case input
    private VisualizerMode mode;
}