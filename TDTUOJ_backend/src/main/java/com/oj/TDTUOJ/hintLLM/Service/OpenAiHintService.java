package com.oj.TDTUOJ.hintLLM.Service;

import com.oj.TDTUOJ.hintLLM.HintRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service("openai")
public class OpenAiHintService implements HintService {

    @Value("${openai.api.key}")
    private String openAiApiKey;

    private final WebClient webClient = WebClient.create("https://api.openai.com");

    @Override
    public String getHint(HintRequest request) {
        List<Map<String, Object>> messages = new ArrayList<>();

        // System message
        messages.add(Map.of(
                "role", "system",
                "content", """
                    You are a helpful coding assistant for a competitive programming judge system.
                    Do NOT greet the user on every message. Get straight to the point.
                    NEVER use dollar signs for math notation. Write O(1) not $O(1)$.
                    Do NOT use markdown bold or italic formatting.
                    Do NOT give away the full solution unless explicitly asked.
                    """
        ));

        // Add history
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
                "model", "gpt-4o-mini",
                "max_tokens", 1024,
                "messages", messages
        );

        Map response = webClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + openAiApiKey)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        List<Map> choices = (List<Map>) response.get("choices");
        Map message = (Map) choices.get(0).get("message");
        return (String) message.get("content");
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