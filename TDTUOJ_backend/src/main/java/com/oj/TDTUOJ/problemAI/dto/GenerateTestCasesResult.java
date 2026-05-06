package com.oj.TDTUOJ.problemAI.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateTestCasesResult {
    private List<ProblemExtractionResult.ExtractedTestCase> testCases;
}
