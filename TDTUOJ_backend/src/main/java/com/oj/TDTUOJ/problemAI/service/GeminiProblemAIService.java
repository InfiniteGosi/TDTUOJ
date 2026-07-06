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

/**
 * Gemini-backed {@link ProblemAIService}.
 *
 * <p>Pipeline for both operations: build a prompt with a strict JSON schema →
 * call {@code gemini-2.5-flash} (low temperature for deterministic structure, with retries)
 * → strip any markdown code fences the model wraps around the JSON → deserialize with Jackson.
 * PDF text is extracted locally via Apache PDFBox before being embedded in the prompt.</p>
 */
@Service
@Slf4j
public class GeminiProblemAIService implements ProblemAIService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private static final long MAX_PDF_SIZE = 4L * 1024 * 1024; // 4 MB
    private static final int MAX_TEST_CASES = 50;
    private static final int MAX_RETRIES = 3;

    // Raise the in-memory decode buffer above the 256KB default: extraction responses
    // (full statement + many test cases as JSON) routinely exceed it.
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com")
            .codecs(cfg -> cfg.defaultCodecs()
                    .maxInMemorySize(8 * 1024 * 1024) // 8 MB buffer
            )
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Validate the upload, extract its text, ask Gemini to structure it, and parse the JSON.
     * If the PDF contained no usable test cases, falls back to AI-generating five so the
     * author is never left with zero cases (flagged via {@code testCasesGenerated=true}).
     */
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

    /** Generate test cases for a statement. Output is a bare JSON array, so it is parsed with a {@code TypeReference}. */
    @Override
    public GenerateTestCasesResult generateTestCases(String problemStatement, int count) {
        int safeCount = Math.max(1, Math.min(count, MAX_TEST_CASES)); // clamp defensively even though callers already do

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

    /** Reject empty, oversized (>4MB), or non-PDF uploads before spending any AI/parse work on them. */
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

    /**
     * Extract the plain text layer from the PDF using Apache PDFBox.
     * Try-with-resources closes the {@link PDDocument} to free native buffers.
     * Note: only extracts embedded text — scanned/image-only PDFs yield blank/garbage
     * (the caller rejects blank output as "empty or unreadable"; there is no OCR step).
     */
    private String extractText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * POST the prompt to Gemini and return the first candidate's text.
     * temperature=0.2 keeps output close to the requested JSON schema; retries with
     * linear backoff (5s/10s/15s) ride out transient errors and rate limits. A
     * {@code MAX_TOKENS} finish reason is turned into a clear error since the JSON
     * would be truncated and unparseable.
     */
    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "maxOutputTokens", 65536,
                        "temperature", 0.2
                )
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
                Map candidate = candidates.get(0);
                String finishReason = (String) candidate.get("finishReason");
                if ("MAX_TOKENS".equals(finishReason)) {
                    throw new RuntimeException("AI response truncated (MAX_TOKENS). Reduce test case count or shrink constraint sizes.");
                }
                Map content = (Map) candidate.get("content");
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

    /**
     * Unwrap a ```json … ``` (or plain ``` … ```) code fence the model often adds despite
     * being told not to, leaving raw JSON for Jackson. Returns "{}" for null so parsing
     * fails cleanly rather than NPE-ing.
     */
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

    /**
     * Build the PDF-extraction prompt. Pins the model to a role, an exact Markdown layout
     * for the statement, difficulty/limit/point defaulting rules, and a JSON output schema.
     * {@code suggestedTags} is constrained to the whitelist of existing active tag names so
     * the model can only propose tags the system actually has.
     */
    private String buildExtractionPrompt(String pdfText, List<String> availableTagNames) {
        // Inline the allowed tag whitelist into the prompt (or a placeholder when none exist).
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

    /**
     * Build the test-case generation prompt. Demands edge/typical coverage, marks the first
     * two as samples, and imposes strict size budgets (≤4KB/case, ≤50KB total) so generated
     * cases stay small enough to store in S3 and run through Judge0 without blowing memory limits.
     */
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
                - SIZE BUDGET: keep each test case under 4KB total. If problem constraints permit large N (e.g. N=100 with 2D matrix, or large arrays), scale DOWN to a representative size (e.g. N=10–20) rather than emitting massive payloads. Do NOT pad with thousands of identical or maximum-value entries.
                - Total output across all test cases must fit comfortably under 50KB
                - Return ONLY a valid JSON array — no markdown fences, no explanation

                JSON schema:
                [{"input": "string", "expectedOutput": "string", "isSample": true}]

                PROBLEM STATEMENT:
                %s
                """.formatted(count, problemStatement);
    }
}
