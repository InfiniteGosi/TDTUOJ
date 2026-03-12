package com.oj.TDTUOJ.hintLLM.Service;

import com.oj.TDTUOJ.hintLLM.HintRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

    @Override
    public String getHint(HintRequest request) {
        List<Map<String, Object>> contents = new ArrayList<>();

        if (request.getHistory() != null) {
            for (Map<String, String> entry : request.getHistory()) {
                String role = entry.get("role").equals("assistant") ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", entry.get("content")))
                ));
            }
        }

        contents.add(Map.of(
                "parts", List.of(Map.of("text", buildPrompt(request)))
        ));

        Map<String, Object> body = Map.of("contents", contents);

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
            You are a helpful coding assistant for a competitive programming judge system. \
            Do NOT greet the user on every message. Get straight to the point. \
            NEVER use dollar signs for math notation, write O(1) not $O(1)$. \
            Do NOT use markdown bold or italic formatting. \
            Do NOT give away the full solution unless explicitly asked.
            
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