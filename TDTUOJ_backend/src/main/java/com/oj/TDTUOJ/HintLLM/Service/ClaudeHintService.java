package com.oj.TDTUOJ.HintLLM.Service;

import com.oj.TDTUOJ.HintLLM.HintRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service("claude")
@Slf4j
public class ClaudeHintService implements HintService {

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.anthropic.com")
            .codecs(configurer -> configurer
                    .defaultCodecs()
                    .jackson2JsonEncoder(new org.springframework.http.codec.json.Jackson2JsonEncoder()))
            .build();

    @Override
    public String getHint(HintRequest request) {
        List<Map<String, Object>> messages = new ArrayList<>();

        // Add history first
        if (request.getHistory() != null) {
            for (Map<String, String> entry : request.getHistory()) {
                messages.add(Map.of(
                        "role", entry.get("role"),
                        "content", entry.get("content")
                ));
            }
        }

        // Add current user message
        messages.add(Map.of("role", "user", "content", buildPrompt(request)));

        Map<String, Object> body = Map.of(
                "model", "claude-haiku-4-5-20251001",
                "max_tokens", 1024,
                "system", """
                    You are a helpful coding assistant for a competitive programming judge system.
                    Do NOT greet the user on every message. Get straight to the point.
                    NEVER use dollar signs for math notation. Write O(1) not $O(1)$.
                    Do NOT use markdown bold or italic formatting.
                    Do NOT give away the full solution unless explicitly asked.
                    """,
                "messages", messages
        );

        Map response = webClient.post()
                .uri("/v1/messages")
                .header("x-api-key", anthropicApiKey)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), clientResponse ->
                        clientResponse.bodyToMono(String.class)
                                .doOnNext(err -> log.error("Anthropic error: {}", err))
                                .then(Mono.error(new RuntimeException("Anthropic API error")))
                )
                .bodyToMono(Map.class)
                .block();

        List<Map> content = (List<Map>) response.get("content");
        return (String) content.get(0).get("text");
    }

    // In GeminiHintService buildPrompt, add at the top:
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