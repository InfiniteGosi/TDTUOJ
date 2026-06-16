package com.oj.TDTUOJ.visualizer.service.classifier;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Layer 2b — Gemini Flash variable classifier.
 *
 * Reads the user's source like a human would and labels what each variable
 * semantically is (graph vs DP table vs tree …). Strictly out of the critical
 * path: any failure resolves to an empty map and the frontend's heuristics
 * carry the run. Results are cached in Redis by source hash, so re-runs while
 * debugging cost zero tokens.
 */
@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class GeminiVariableClassifier implements VariableClassifier {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com")
            .build();

    private static final Duration CACHE_TTL   = Duration.ofHours(24);
    private static final String   CACHE_PREFIX = "viz:classify:";
    private static final int      MAX_SOURCE_CHARS = 12_000;

    private static final String INSTRUCTION = """
            You label variables in a program for a data-structure visualizer. \
            For each variable that holds a data structure, decide its semantic role from how the CODE uses it \
            (e.g. a 2D int array indexed as m[u][v] inside graph traversal is a graph adjacency matrix, \
            while one filled as dp[i][j] = f(dp[i-1][j], ...) is a DP table).

            Respond with ONLY a JSON object, no prose, of the form:
            {"variableName": {"role": "<role>", "form": "<form>", "directed": <bool>, "confidence": <0..1>}}

            role must be one of: graph, tree, linked-list, stack, queue, dp-table, matrix, array, other
            form (only for graphs): adjacency-matrix, adjacency-list, edge-list
            directed (only for graphs): true/false; omit when unknown.
            Omit plain loop counters and scalars. Omit variables you are unsure about rather than guessing wildly.
            """;

    @Override
    public CompletableFuture<Map<String, Object>> classify(String sourceCode, SubmissionLanguage language) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return CompletableFuture.completedFuture(Collections.emptyMap());
        }

        String cacheKey = CACHE_PREFIX + sha256(language.name() + "\n" + sourceCode);
        try {
            String cached = redis.opsForValue().get(cacheKey);
            if (cached != null) {
                return CompletableFuture.completedFuture(parseLabels(cached));
            }
        } catch (Exception e) {
            log.debug("Classifier cache read failed: {}", e.toString());
        }

        String source = sourceCode.length() > MAX_SOURCE_CHARS
                ? sourceCode.substring(0, MAX_SOURCE_CHARS)
                : sourceCode;

        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", INSTRUCTION))),
                "contents", List.of(Map.of("parts", List.of(Map.of(
                        "text", "Language: " + language.name() + "\n\n```\n" + source + "\n```")))),
                "generationConfig", Map.of(
                        "temperature", 0,
                        "responseMimeType", "application/json"
                )
        );

        return webClient.post()
                .uri("/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(10))
                .toFuture()
                .thenApply(response -> {
                    String text = extractText(response);
                    Map<String, Object> labels = parseLabels(text);
                    if (!labels.isEmpty()) {
                        try {
                            redis.opsForValue().set(cacheKey, text, CACHE_TTL);
                        } catch (Exception e) {
                            log.debug("Classifier cache write failed: {}", e.toString());
                        }
                    }
                    return labels;
                })
                .exceptionally(e -> {
                    log.debug("Variable classification failed: {}", e.toString());
                    return Collections.emptyMap();
                });
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private String extractText(Map response) {
        try {
            List<Map> candidates = (List<Map>) response.get("candidates");
            Map content = (Map) candidates.get(0).get("content");
            List<Map> parts = (List<Map>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return null;
        }
    }

    /** Strict parse: anything malformed ⇒ empty map (heuristics take over). */
    private Map<String, Object> parseLabels(String text) {
        if (text == null || text.isBlank()) return Collections.emptyMap();
        String json = text.trim();
        if (json.startsWith("```")) { // defensive — shouldn't happen with responseMimeType
            json = json.replaceAll("^```(?:json)?\\s*", "").replaceAll("```\\s*$", "");
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            // keep only well-formed entries: value must be a map with a string role
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<String, Object> e : parsed.entrySet()) {
                if (e.getValue() instanceof Map<?, ?> v && v.get("role") instanceof String) {
                    out.put(e.getKey(), e.getValue());
                }
            }
            return out;
        } catch (Exception e) {
            log.debug("Classifier returned unparseable JSON");
            return Collections.emptyMap();
        }
    }

    private String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(s.hashCode());
        }
    }
}
