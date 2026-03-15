package com.oj.TDTUOJ.visualizer;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import lombok.Data;

@Data
public class VisualizerRequest {
    private String sourceCode;
    private SubmissionLanguage language;
    private String stdin;       // optional — test case input
}