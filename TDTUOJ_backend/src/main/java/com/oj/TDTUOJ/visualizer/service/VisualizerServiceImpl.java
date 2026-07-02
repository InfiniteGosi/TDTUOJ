package com.oj.TDTUOJ.visualizer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;
import com.oj.TDTUOJ.visualizer.service.classifier.VariableClassifier;
import com.oj.TDTUOJ.visualizer.service.tracer.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Orchestrates a visualization run:
 * instrument (tracer) → execute (Judge0) → parse frames (stderr) → attach LLM
 * classifications (best-effort, time-budgeted).
 */
@Service
@Slf4j
public class VisualizerServiceImpl implements VisualizerService {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final VariableClassifier classifier;

    private final Map<SubmissionLanguage, Tracer> tracers;

    public VisualizerServiceImpl(WebClient.Builder webClientBuilder,
                                 ObjectMapper objectMapper,
                                 VariableClassifier classifier) {
        this.webClientBuilder = webClientBuilder;
        this.objectMapper = objectMapper;
        this.classifier = classifier;
        this.tracers = Map.of(
                SubmissionLanguage.PYTHON,     new PythonTracer(),
                SubmissionLanguage.JAVASCRIPT, new JsTracer(),
                SubmissionLanguage.JAVA,       new JavaTracer(),
                SubmissionLanguage.CSHARP,     new CSharpTracer(),
                SubmissionLanguage.CPP,        new CppTracer(),
                SubmissionLanguage.C,          new CTracer()
        );
    }

    private static final Map<SubmissionLanguage, Integer> LANG_ID = Map.of(
            SubmissionLanguage.PYTHON,     71,
            SubmissionLanguage.JAVA,       62,
            SubmissionLanguage.C,          50,
            SubmissionLanguage.CPP,        76,
            SubmissionLanguage.CSHARP,     51,
            SubmissionLanguage.JAVASCRIPT, 63
    );

    private static final int  MAX_CODE_BYTES        = 50_000;
    private static final long CLASSIFIER_BUDGET_MS  = 3_000;

    @Override
    public Response<VisualizerResponse> visualize(VisualizerRequest request) {
        validateRequest(request);
        log.info("Visualizing: language={}, codeLength={}",
                request.getLanguage(), request.getSourceCode().length());

        String instrumented;
        try {
            instrumented = tracers.get(request.getLanguage()).instrument(request.getSourceCode());
        } catch (TracerException e) {
            log.warn("Instrumentation failed for {}: {}", request.getLanguage(), e.getMessage());
            return ok(error("Couldn't instrument your code: " + e.getMessage()), request);
        }

        // Classification needs only the raw source — run it concurrently with Judge0.
        CompletableFuture<Map<String, Object>> classification =
                classifier.classify(request.getSourceCode(), request.getLanguage());

        Map<?, ?> judge0Response;
        try {
            judge0Response = submitToJudge0(
                    instrumented,
                    request.getLanguage(),
                    request.getStdin()
            );
        } catch (Exception e) {
            // Judge0 unreachable / hung / errored — surface a friendly message
            // instead of leaking the raw "Connection refused: ...:2358".
            log.error("Judge0 unavailable during visualization", e);
            return ok(error("The code execution service is currently unavailable. Please try again in a moment."), request);
        }

        VisualizerResponse result = parseJudge0Response(judge0Response);
        result.setClassifications(awaitClassification(classification));

        return ok(result, request);
    }

    private Response<VisualizerResponse> ok(VisualizerResponse result, VisualizerRequest request) {
        result.setLanguage(request.getLanguage().name());
        return Response.<VisualizerResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message(result.getError() != null ? "Visualization failed" : "Visualization complete")
                .data(result)
                .build();
    }

    private Map<String, Object> awaitClassification(CompletableFuture<Map<String, Object>> future) {
        try {
            Map<String, Object> labels = future.get(CLASSIFIER_BUDGET_MS, TimeUnit.MILLISECONDS);
            return labels != null ? labels : Collections.emptyMap();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Collections.emptyMap();
        } catch (Exception e) {
            log.debug("Variable classification unavailable: {}", e.toString());
            return Collections.emptyMap();
        }
    }

    // ── Judge0 submission ─────────────────────────────────────────────────────

    private Map<?, ?> submitToJudge0(String code, SubmissionLanguage language, String stdin) {
        Map<String, Object> body = new HashMap<>();
        body.put("source_code",    encode(code));
        body.put("language_id",    LANG_ID.get(language));
        body.put("stdin",          encode(stdin != null ? stdin : ""));
        body.put("cpu_time_limit", 10.0);
        body.put("memory_limit",   262144);

        return webClientBuilder
                .baseUrl(judge0Url)
                .build()
                .post()
                .uri("/submissions?base64_encoded=true&wait=true")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // ── Response parsing ──────────────────────────────────────────────────────

    private VisualizerResponse parseJudge0Response(Map<?, ?> response) {
        if (response == null) return error("No response from Judge0");

        int statusId = extractStatusId(response);
        log.info("Judge0 visualizer status id: {}", statusId);

        String compileOutput = decode(response.get("compile_output"));
        if (compileOutput != null && !compileOutput.isBlank()) {
            return error("Compile error:\n" + compileOutput.trim());
        }

        String stdout = decode(response.get("stdout"));
        String stderr = decode(response.get("stderr"));

        if (statusId == 5) {
            return error("Time limit exceeded — your program may loop forever, or trace too many steps");
        }

        return extractFrames(stdout, stderr);
    }

    /**
     * Frames arrive on STDERR between {@code __FRAMES__} and {@code __END__};
     * everything else on stderr is genuine runtime-error output. Stdout is the
     * user's untouched program output.
     */
    private VisualizerResponse extractFrames(String stdout, String stderr) {
        String userStdout = stdout == null || stdout.isBlank() ? null : stdout.stripTrailing();

        if (stderr == null || !stderr.contains(Tracer.FRAMES_BEGIN)) {
            String err = stderr != null && !stderr.isBlank()
                    ? "Runtime error:\n" + stderr.trim()
                    : "No trace produced — the program may have crashed before any line executed";
            return VisualizerResponse.builder()
                    .frames(Collections.emptyList())
                    .stdout(userStdout)
                    .error(err)
                    .build();
        }

        int start = stderr.indexOf(Tracer.FRAMES_BEGIN);
        int end   = stderr.indexOf(Tracer.FRAMES_END, start);
        if (end == -1) {
            return VisualizerResponse.builder()
                    .frames(Collections.emptyList())
                    .stdout(userStdout)
                    .error("Trace was cut off — output limit reached. Try a smaller input.")
                    .build();
        }

        String framesJson = stderr.substring(start + Tracer.FRAMES_BEGIN.length(), end).trim();
        String userStderr = (stderr.substring(0, start) + stderr.substring(end + Tracer.FRAMES_END.length())).trim();

        try {
            List<Map<String, Object>> frames = objectMapper.readValue(
                    framesJson, new TypeReference<>() {});
            log.info("Parsed {} frames", frames.size());

            String warning = null;
            if (frames.size() > Tracer.MAX_FRAMES) {
                warning = "Trace truncated: showing first " + Tracer.MAX_FRAMES + " of "
                        + frames.size() + " steps.";
                frames = frames.subList(0, Tracer.MAX_FRAMES);
            } else if (!frames.isEmpty()
                    && Boolean.TRUE.equals(frames.get(frames.size() - 1).get("truncated"))) {
                warning = "Trace truncated at " + Tracer.MAX_FRAMES + " steps.";
            }

            return VisualizerResponse.builder()
                    .frames(frames)
                    .stdout(userStdout)
                    .error(userStderr.isBlank() ? null : userStderr)
                    .warning(warning)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse frames JSON", e);
            return VisualizerResponse.builder()
                    .frames(Collections.emptyList())
                    .stdout(userStdout)
                    .error("Internal error: trace output could not be parsed")
                    .build();
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private void validateRequest(VisualizerRequest request) {
        if (request.getSourceCode() == null || request.getSourceCode().isBlank()) {
            throw new IllegalArgumentException("Source code is required");
        }
        if (request.getLanguage() == null) {
            throw new IllegalArgumentException("Language is required");
        }
        if (!LANG_ID.containsKey(request.getLanguage())) {
            throw new IllegalArgumentException("Unsupported language: " + request.getLanguage());
        }
        if (request.getSourceCode().getBytes().length > MAX_CODE_BYTES) {
            throw new IllegalArgumentException(
                    "Source code too large: max " + (MAX_CODE_BYTES / 1024) + "KB allowed");
        }
    }

    private int extractStatusId(Map<?, ?> response) {
        try {
            return (int) ((Map<?, ?>) response.get("status")).get("id");
        } catch (Exception e) {
            return -1;
        }
    }

    private VisualizerResponse error(String message) {
        return VisualizerResponse.builder().error(message).build();
    }

    private String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes());
    }

    private String decode(Object value) {
        if (value == null) return null;
        try {
            String cleaned = value.toString().replaceAll("\\s+", "");
            return new String(Base64.getDecoder().decode(cleaned));
        } catch (Exception e) {
            return value.toString();
        }
    }
}
