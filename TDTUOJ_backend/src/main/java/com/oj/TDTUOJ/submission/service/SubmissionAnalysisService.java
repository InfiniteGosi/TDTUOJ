package com.oj.TDTUOJ.submission.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.submission.dto.SubmissionAnalysisResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Produces a LeetCode-style analysis of a submission via Gemini. Self-contained Gemini client,
 * mirroring {@code GeminiProblemAIService}. Returns structured JSON (approach / efficiency /
 * code style) including a canonical complexity class used by the frontend Big-O graph.
 */
@Service
@Slf4j
public class SubmissionAnalysisService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private static final int MAX_RETRIES = 3;

    /** Canonical complexity classes the model must choose from (drives the Big-O graph). */
    private static final List<String> COMPLEXITY_CLASSES = List.of(
            "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)", "O(n^3)", "O(2^n)", "O(n!)");

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com")
            .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public SubmissionAnalysisResult analyze(String problemTitle,
                                            String problemStatement,
                                            SubmissionLanguage language,
                                            String sourceCode) {
        String prompt = buildPrompt(problemTitle, problemStatement, language, sourceCode);
        String rawJson = callGemini(prompt);
        String cleanJson = stripMarkdownFences(rawJson);
        try {
            SubmissionAnalysisResult result =
                    objectMapper.readValue(cleanJson, SubmissionAnalysisResult.class);
            normalizeComplexityClass(result);
            return result;
        } catch (Exception e) {
            log.error("Failed to parse analysis JSON: {}", cleanJson, e);
            throw new RuntimeException("AI returned invalid analysis JSON. Please try again.");
        }
    }

    // Ensure complexityClass is one of the canonical set so the frontend graph can map it.
    private void normalizeComplexityClass(SubmissionAnalysisResult result) {
        if (result.getEfficiency() == null) return;
        String cc = result.getEfficiency().getComplexityClass();
        if (cc == null) { result.getEfficiency().setComplexityClass("O(n)"); return; }
        String norm = cc.trim().toLowerCase().replace(" ", "");
        for (String canonical : COMPLEXITY_CLASSES) {
            if (canonical.toLowerCase().replace(" ", "").equals(norm)) {
                result.getEfficiency().setComplexityClass(canonical);
                return;
            }
        }
        result.getEfficiency().setComplexityClass("O(n)"); // fallback
    }

    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("maxOutputTokens", 4096, "temperature", 0.2)
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
                Map content = (Map) candidate.get("content");
                List<Map> parts = (List<Map>) content.get("parts");
                return (String) parts.get(0).get("text");

            } catch (Exception e) {
                if (attempt == MAX_RETRIES) {
                    throw new RuntimeException("Gemini API unavailable after "
                            + MAX_RETRIES + " retries: " + e.getMessage());
                }
                log.warn("Gemini analysis call failed (attempt {}/{}), retrying...", attempt, MAX_RETRIES);
                try {
                    Thread.sleep(3000L * attempt);
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
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("```(?:json)?\\s*", "");
            int lastFence = trimmed.lastIndexOf("```");
            if (lastFence != -1) trimmed = trimmed.substring(0, lastFence).trim();
        }
        return trimmed;
    }

    private String buildPrompt(String title, String statement,
                               SubmissionLanguage language, String sourceCode) {
        String stmt = (statement == null || statement.isBlank())
                ? "(statement unavailable — infer from the code)" : statement;
        return """
                You are an expert competitive-programming mentor reviewing an ACCEPTED solution.
                Analyze the code and return a concise, encouraging assessment.

                RULES:
                - "complexityClass" MUST be exactly one of: %s
                  (pick the tightest matching time complexity of the submitted code).
                - "currentComplexity" is a human-readable time complexity, e.g. "O(N log N)".
                - "suggestedComplexity" = the best achievable complexity for this problem; if the
                  submission is already optimal, set it equal to currentComplexity.
                - "approach.current" = algorithms/data structures the code actually uses
                  (short names, e.g. "Depth-First Search", "Hash Table").
                - "approach.suggested" = a recommended set for the optimal approach; if already
                  optimal, repeat the current set.
                - "approach.keyIdea" = one sentence naming the core technique.
                - "summary" = one upbeat sentence acknowledging what the solution demonstrates.
                - "codeStyle" = one or two sentences of constructive style feedback.
                - Return ONLY valid JSON. No markdown fences, no commentary.

                JSON schema:
                {
                  "summary": "string",
                  "approach": {
                    "current": ["string"],
                    "suggested": ["string"],
                    "keyIdea": "string"
                  },
                  "efficiency": {
                    "currentComplexity": "string",
                    "suggestedComplexity": "string",
                    "complexityClass": "one of %s",
                    "suggestions": "string"
                  },
                  "codeStyle": "string"
                }

                PROBLEM TITLE: %s

                PROBLEM STATEMENT:
                %s

                LANGUAGE: %s

                SOURCE CODE:
                ```
                %s
                ```
                """.formatted(COMPLEXITY_CLASSES, COMPLEXITY_CLASSES, title, stmt, language, sourceCode);
    }
}
