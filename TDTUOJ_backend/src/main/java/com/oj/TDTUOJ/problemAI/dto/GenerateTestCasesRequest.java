package com.oj.TDTUOJ.problemAI.dto;

import lombok.Data;

@Data
public class GenerateTestCasesRequest {
    private String problemStatement; // Markdown statement from the form
    private int count;               // Number of test cases to generate (1–50)
}
