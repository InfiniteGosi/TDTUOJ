package com.oj.TDTUOJ.problemAI.service;

import com.oj.TDTUOJ.problemAI.dto.GenerateTestCasesResult;
import com.oj.TDTUOJ.problemAI.dto.ProblemExtractionResult;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface ProblemAIService {
    ProblemExtractionResult extractFromPdf(MultipartFile pdfFile, List<String> availableTagNames) throws IOException;
    GenerateTestCasesResult generateTestCases(String problemStatement, int count);
}
