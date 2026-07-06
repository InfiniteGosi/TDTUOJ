package com.oj.TDTUOJ.problemAI.service;

import com.oj.TDTUOJ.problemAI.dto.GenerateTestCasesResult;
import com.oj.TDTUOJ.problemAI.dto.ProblemExtractionResult;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * AI-assisted problem authoring: parse a PDF problem statement into structured fields
 * and synthesize test cases. Implemented by {@code GeminiProblemAIService}.
 */
public interface ProblemAIService {
    /**
     * Extract structured problem data from an uploaded PDF.
     * @param availableTagNames active tag names the model may choose from for suggestions
     *                           (constrains output to tags that actually exist in the system)
     */
    ProblemExtractionResult extractFromPdf(MultipartFile pdfFile, List<String> availableTagNames) throws IOException;

    /** Generate {@code count} test cases (clamped 1–50) for the given problem statement. */
    GenerateTestCasesResult generateTestCases(String problemStatement, int count);
}
