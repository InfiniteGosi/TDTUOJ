package com.oj.TDTUOJ.problemAI.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.problemAI.dto.GenerateTestCasesResult;
import com.oj.TDTUOJ.problemAI.dto.ProblemExtractionResult;
import com.oj.TDTUOJ.problemAI.dto.ProblemExtractionResult.ExtractedTestCase;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiProblemAIService implements ProblemAIService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private static final long MAX_PDF_SIZE = 4L * 1024 * 1024; // 4 MB
    private static final int MAX_TEST_CASES = 50;
    private static final int MAX_RETRIES = 3;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com")
            .codecs(cfg -> cfg.defaultCodecs()
                    .maxInMemorySize(8 * 1024 * 1024) // 8 MB buffer
            )
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Public API ───────────────────────────────────────────────────────────

    @Override
    public ProblemExtractionResult extractFromPdf(MultipartFile pdfFile,
                                                   List<String> availableTagNames) throws IOException {
        validatePdf(pdfFile);

        String pdfText = extractText(pdfFile);
        if (pdfText == null || pdfText.isBlank()) {
            throw new RuntimeException("PDF appears to be empty or unreadable");
        }

        String prompt = buildExtractionPrompt(pdfText, availableTagNames);
        String rawJson = callGemini(prompt);
        String cleanJson = stripMarkdownFences(rawJson);

        ProblemExtractionResult result;
        try {
            result = objectMapper.readValue(cleanJson, ProblemExtractionResult.class);
        } catch (Exception e) {
            log.error("Failed to parse extraction JSON: {}", cleanJson, e);
            throw new RuntimeException("AI returned invalid JSON. Please try again.");
        }

        // If no test cases found in PDF, generate 5 automatically
        if (result.getTestCases() == null || result.getTestCases().isEmpty()) {
            log.info("No test cases found in PDF, generating 5 via AI...");
            GenerateTestCasesResult generated = generateTestCases(result.getStatement(), 5);
            result.setTestCases(generated.getTestCases());
            result.setTestCasesGenerated(true);
        }

        return result;
    }

    @Override
    public GenerateTestCasesResult generateTestCases(String problemStatement, int count) {
        int safeCount = Math.max(1, Math.min(count, MAX_TEST_CASES));

        String prompt = buildGenerationPrompt(problemStatement, safeCount);
        String rawJson = callGemini(prompt);
        String cleanJson = stripMarkdownFences(rawJson);

        List<ExtractedTestCase> testCases;
        try {
            testCases = objectMapper.readValue(cleanJson,
                    new TypeReference<List<ExtractedTestCase>>() {});
        } catch (Exception e) {
            log.error("Failed to parse generated test cases JSON: {}", cleanJson, e);
            throw new RuntimeException("AI returned invalid JSON for test cases. Please try again.");
        }

        return GenerateTestCasesResult.builder()
                .testCases(testCases)
                .build();
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("PDF file is required");
        }
        if (file.getSize() > MAX_PDF_SIZE) {
            throw new RuntimeException("PDF file must be under 4MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new RuntimeException("Uploaded file must be a PDF");
        }
    }

    private String extractText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                Map response = webClient.post()
                        .uri("/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey)
                        .header("Content-Type", "application/json")
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                List<Map> candidates = (List<Map>) response.get("candidates");
                Map content = (Map) candidates.get(0).get("content");
                List<Map> parts = (List<Map>) content.get("parts");
                return (String) parts.get(0).get("text");

            } catch (Exception e) {
                if (attempt == MAX_RETRIES) {
                    throw new RuntimeException("Gemini API unavailable after " + MAX_RETRIES + " retries: " + e.getMessage());
                }
                log.warn("Gemini call failed (attempt {}/{}), retrying...", attempt, MAX_RETRIES);
                try {
                    Thread.sleep(5000L * attempt); // 5s, 10s, 15s
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Request interrupted");
                }
            }
        }

        throw new RuntimeException("Gemini API unavailable");
    }

    private String stripMarkdownFences(String raw) {
        if (raw == null) return "{}";
        // Remove ```json ... ``` or ``` ... ``` wrapping
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("```(?:json)?\\s*", "");
            int lastFence = trimmed.lastIndexOf("```");
            if (lastFence != -1) {
                trimmed = trimmed.substring(0, lastFence).trim();
            }
        }
        return trimmed;
    }

    // ─── Prompts ──────────────────────────────────────────────────────────────

    private String buildExtractionPrompt(String pdfText, List<String> availableTagNames) {
        String tagList = (availableTagNames != null && !availableTagNames.isEmpty())
                ? String.join(", ", availableTagNames)
                : "(no tags available)";

        return """
                You are a competitive programming problem parser.
                Extract structured problem data from the PDF text below.

                STATEMENT FORMAT — the "statement" field MUST follow this exact Markdown structure:
                ```
                [Brief problem description paragraph(s) using inline code for variable names]

                #### Input format
                [Describe the input format clearly]

                #### Output format
                [Describe the output format clearly]

                #### Constraints
                - [constraint 1]
                - [constraint 2]

                #### Sample test case 1
                Input
                ```
                [input data]
                ```
                Output
                ```
                [output data]
                ```

                #### Sample test case 2
                Input
                ```
                [input data]
                ```
                Output
                ```
                [output data]
                ```
                ```
                - Use #### for section headings (Input format, Output format, Constraints, Sample test case N)
                - Use backtick fences for all input/output data blocks
                - Use inline backticks for variable names and values in descriptions
                - List ALL sample test cases from the PDF in the statement
                - Keep mathematical formulas in plain text (e.g. 2 <= k <= 9, not LaTeX)

                EXTRACTION RULES:
                - Assess difficulty: EASY (basic loops/conditionals), MEDIUM (standard algorithms), HARD (advanced algorithms/math)
                - Extract ALL input/output test case pairs found in the document into testCases array
                - Mark test cases shown in "Example"/"Sample" sections as isSample=true, generated/hidden as isSample=false
                - If time limit not specified, default to 2.0 seconds
                - If memory limit not specified, default to 256 MB
                - Assign points based on difficulty: EASY=5, MEDIUM=15, HARD=25
                - For suggestedTags, pick ONLY from this list: [%s]
                  Pick tags that match the problem topic. Return empty array if none match.
                - Return ONLY valid JSON — no markdown fences, no explanation text

                JSON schema:
                {
                  "title": "string",
                  "statement": "string (markdown following the format above)",
                  "difficulty": "EASY|MEDIUM|HARD",
                  "timeLimit": 2.0,
                  "memoryLimit": 256,
                  "point": 15,
                  "testCases": [
                    {"input": "string", "expectedOutput": "string", "isSample": true}
                  ],
                  "suggestedTags": ["string"]
                }

                PDF TEXT:
                %s
                """.formatted(tagList, pdfText);
    }

    private String buildGenerationPrompt(String problemStatement, int count) {
        return """
                You are a competitive programming test case generator.
                Generate exactly %d test cases for the problem below.

                RULES:
                - Include edge cases (min/max values, boundary conditions, empty inputs where valid)
                - Include typical cases of varying sizes
                - First 2 test cases should be simple and mark isSample=true, rest mark isSample=false
                - Each test case must have valid input matching problem constraints exactly
                - Each test case must have the correct expected output
                - Input and output format must match exactly what the problem describes
                - Return ONLY a valid JSON array — no markdown fences, no explanation

                JSON schema:
                [{"input": "string", "expectedOutput": "string", "isSample": true}]

                PROBLEM STATEMENT:
                %s
                """.formatted(count, problemStatement);
    }
}
