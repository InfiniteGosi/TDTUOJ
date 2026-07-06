package com.oj.TDTUOJ.hintLLM.Service;

import com.oj.TDTUOJ.hintLLM.HintRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenAI (GPT) implementation of {@link HintService}, registered under the bean
 * name {@code "openai"} for {@code HintController} routing.
 *
 * <p>Unlike the Claude provider (which passes the guardrails via a dedicated
 * {@code system} field), OpenAI's guard preamble is sent as an explicit
 * {@code role:"system"} message prepended to the conversation.
 */
@Service("openai")
public class OpenAiHintService implements HintService {

    @Value("${openai.api.key}")
    private String openAiApiKey;

    // Reactive HTTP client for the OpenAI Chat Completions API.
    private final WebClient webClient = WebClient.create("https://api.openai.com");

    /**
     * Prepend the guard system message, replay history, append the built user
     * prompt, call Chat Completions synchronously, and return the first choice's text.
     */
    @Override
    public String getHint(HintRequest request) {
        List<Map<String, Object>> messages = new ArrayList<>();

        // Guardrails delivered as a system-role message (OpenAI convention).
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

        // Chat Completions returns a list of choices; take the first message's content.
        List<Map> choices = (List<Map>) response.get("choices");
        Map message = (Map) choices.get(0).get("message");
        return (String) message.get("content");
    }

    /**
     * Assemble the user-turn prompt: problem title/statement, optional current-code
     * and error blocks (only when non-blank), then the user's question. The guard
     * preamble is NOT repeated here — it rides in the system message.
     */
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