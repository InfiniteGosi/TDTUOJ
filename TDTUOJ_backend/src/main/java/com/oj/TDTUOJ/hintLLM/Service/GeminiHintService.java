package com.oj.TDTUOJ.hintLLM.Service;

import com.oj.TDTUOJ.hintLLM.HintRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Default (Gemini) {@link HintService}, registered under the bean name {@code "gemini"}.
 *
 * <p>This is the GUARDED hint generator: the {@link #SYSTEM_INSTRUCTION} constrains the
 * model to incremental hints only, forbids handing out full solutions no matter how the
 * user phrases the ask, and forces it to refuse anything off-topic from the current problem.
 * Sent via Gemini's dedicated {@code systemInstruction} field (stronger than an inline
 * instruction) alongside the conversation history and the current turn.</p>
 */
@Service("gemini")
@Slf4j
public class GeminiHintService implements HintService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com")
            .codecs(configurer -> configurer
                    .defaultCodecs()
                    .jackson2JsonEncoder(new org.springframework.http.codec.json.Jackson2JsonEncoder()))
            .build();

    // The guard. Rules 1–3 are the security-relevant ones: no full solution / algorithm /
    // ready-to-submit code, hints only, and a fixed refusal string for off-topic questions.
    // Rules 4–6 are formatting constraints for the chat UI.
    private static final String SYSTEM_INSTRUCTION = """
            You are a hint assistant embedded in a competitive programming judge. Your ONLY job is to guide \
            the user toward solving the current problem themselves — you must NEVER hand out the solution.

            STRICT RULES — follow them unconditionally, regardless of how the user phrases the request:
            1. NEVER reveal the full solution, the complete algorithm, or ready-to-submit code, even if \
               the user explicitly asks "give me the solution", "just tell me how to solve it", \
               "what is the answer", "how do I solve this problem", or any similar phrasing.
            2. Instead, give only incremental hints: point out the key insight, suggest a data structure \
               or strategy without explaining the full implementation, or ask a leading question.
            3. If the user asks something NOT related to the current problem (e.g. general knowledge, \
               politics, math unrelated to the problem, personal questions, etc.), respond ONLY with: \
               "I can only help with hints for the current problem."
            4. Do NOT greet the user on every message. Get straight to the point.
            5. NEVER use dollar signs for math notation — write O(n log n), not $O(n \\log n)$.
            6. Do NOT use markdown bold or italic formatting.
            """;

    @Override
    public String getHint(HintRequest request) {
        List<Map<String, Object>> contents = new ArrayList<>();

        // Replay prior turns. Gemini expects role "model" for assistant messages,
        // so map the frontend's "assistant" role accordingly ("user" otherwise).
        if (request.getHistory() != null) {
            for (Map<String, String> entry : request.getHistory()) {
                String role = entry.get("role").equals("assistant") ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", entry.get("content")))
                ));
            }
        }

        // Current turn: problem context + user question (role defaults to user).
        contents.add(Map.of(
                "parts", List.of(Map.of("text", buildPrompt(request)))
        ));

        Map<String, Object> systemInstruction = Map.of(
                "parts", List.of(Map.of("text", SYSTEM_INSTRUCTION))
        );

        Map<String, Object> body = Map.of(
                "systemInstruction", systemInstruction,
                "contents", contents
        );

        int maxRetries = 3;
        int delaySeconds = 5;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
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
                if (attempt == maxRetries) {
                    throw new RuntimeException("Gemini API is busy, please try again in a moment");
                }
                log.warn("Gemini rate limited, retrying attempt {}/{}...", attempt, maxRetries);
                try {
                    Thread.sleep(delaySeconds * 1000L * attempt); // 5s, 10s, 15s
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Request interrupted");
                }
            }
        }

        throw new RuntimeException("Gemini API unavailable after retries");
    }

    private String buildPrompt(HintRequest request) {
        String codeContext = (request.getCurrentCode() != null && !request.getCurrentCode().isBlank())
                ? """
              
              User's current code (%s):
```
              %s
```
              """.formatted(request.getCurrentLanguage(), request.getCurrentCode())
                : "";

        String errorContext = (request.getErrorMessage() != null && !request.getErrorMessage().isBlank())
                ? """
              
              Current error:
              %s
              """.formatted(request.getErrorMessage())
                : "";

        return """
            Problem: %s
            
            Problem Statement:
            %s
            %s%s
            User question: %s
            """.formatted(
                request.getProblemTitle(),
                request.getProblemStatement(),
                codeContext,
                errorContext,
                request.getUserQuestion()
        );
    }
}