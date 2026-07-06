package com.oj.TDTUOJ.problemAI.dto;

import lombok.Data;

/** Request body for AI test-case generation: the problem text and how many cases to produce (clamped to 1–50 server-side). */
@Data
public class GenerateTestCasesRequest {
    private String problemStatement; // Markdown statement from the form
    private int count;               // Number of test cases to generate (1–50)
}
