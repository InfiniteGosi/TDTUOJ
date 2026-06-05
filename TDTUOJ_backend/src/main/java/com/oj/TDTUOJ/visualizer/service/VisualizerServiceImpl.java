package com.oj.TDTUOJ.visualizer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.VisualizerMode;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;
import com.oj.TDTUOJ.visualizer.service.instrumentor.CppInstrumentor;
import com.oj.TDTUOJ.visualizer.service.instrumentor.JavaInstrumentor;
import com.oj.TDTUOJ.visualizer.service.instrumentor.PythonInstrumentor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisualizerServiceImpl implements VisualizerService {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    private static final Map<SubmissionLanguage, Integer> LANG_ID = Map.of(
            SubmissionLanguage.PYTHON, 71,
            SubmissionLanguage.JAVA,   62,
            SubmissionLanguage.C,      50,
            SubmissionLanguage.CPP,    76
    );

    private static final int MAX_FRAMES    = 5000;
    private static final int MAX_CODE_BYTES = 50_000;

    @Override
    public Response<VisualizerResponse> visualize(VisualizerRequest request) {
        validateRequest(request);

        VisualizerMode mode = request.getMode();
        if (mode == null) {
            log.warn("VisualizerRequest.mode is null — defaulting to MANUAL.");
            mode = VisualizerMode.MANUAL;
        }
        log.info("Visualizing: language={}, mode={}, codeLength={}",
                request.getLanguage(), mode, request.getSourceCode().length());

        String instrumented = instrument(request.getSourceCode(), request.getLanguage(), mode);

        Map<?, ?> judge0Response = submitToJudge0(
                instrumented,
                request.getLanguage(),
                request.getStdin()
        );

        VisualizerResponse result = parseJudge0Response(judge0Response);

        return Response.<VisualizerResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message(result.getError() != null ? "Visualization failed" : "Visualization complete")
                .data(result)
                .build();
    }

    // ── Instrumentation dispatch ──────────────────────────────────────────────

    private String instrument(String code, SubmissionLanguage lang, VisualizerMode mode) {
        if (mode == VisualizerMode.AUTO) {
            return switch (lang) {
                case PYTHON      -> PythonInstrumentor.instrumentAuto(code);
                case JAVA        -> JavaInstrumentor.instrumentAuto(code);
                case C           -> CppInstrumentor.instrumentCAuto(code);
                case CPP         -> CppInstrumentor.instrumentCppAuto(code);
                case CSHARP, JAVASCRIPT -> throw new com.oj.TDTUOJ.common.exceptions.BadRequestException("Visualizer not supported for this language");
            };
        }
        return switch (lang) {
            case PYTHON      -> PythonInstrumentor.instrumentManual(code);
            case JAVA        -> JavaInstrumentor.instrumentManual(code);
            case C           -> CppInstrumentor.instrumentCManual(code);
            case CPP         -> CppInstrumentor.instrumentCppManual(code);
            case CSHARP, JAVASCRIPT -> throw new com.oj.TDTUOJ.common.exceptions.BadRequestException("Visualizer not supported for this language");
        };
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

        String stderr = decode(response.get("stderr"));

        if (statusId == 5) {
            return error("Time limit exceeded — your algorithm may have too many snapshot() calls or an infinite loop");
        }

        String rawStdout = decode(response.get("stdout"));
        log.info("=== RAW STDOUT ===\n{}", rawStdout);
        log.info("=== STDERR ===\n{}", decode(response.get("stderr")));
        log.info("=== COMPILE OUTPUT ===\n{}", decode(response.get("compile_output")));

        if (rawStdout == null || rawStdout.isBlank()) {
            String msg = stderr != null && !stderr.isBlank()
                    ? "Runtime error:\n" + stderr.trim()
                    : "No output — did you call snapshot() in your code?";
            return error(msg);
        }

        return extractFrames(rawStdout, stderr);
    }

    private VisualizerResponse extractFrames(String rawStdout, String stderr) {
        int start = rawStdout.indexOf("__FRAMES__");
        int end   = rawStdout.indexOf("__END__");

        if (start == -1 || end == -1) {
            return VisualizerResponse.builder()
                    .frames(Collections.emptyList())
                    .stdout(rawStdout.trim())
                    .error("No frames found — did you call snapshot() in your code?")
                    .build();
        }

        String framesJson = rawStdout.substring(start + "__FRAMES__".length(), end).trim();
        String userStdout = rawStdout.substring(0, start).trim();

        try {
            List<Map<String, Object>> frames = objectMapper.readValue(
                    framesJson, new TypeReference<>() {});

            log.info("Parsed {} frames successfully", frames.size());

            String warning = null;
            if (frames.size() > MAX_FRAMES) {
                log.warn("Frame count {} exceeds limit {}, truncating", frames.size(), MAX_FRAMES);
                warning = "Output truncated: " + frames.size() + " frames captured, showing first " + MAX_FRAMES + ".";
                frames = frames.subList(0, MAX_FRAMES);
            }

            String errorMsg = stderr != null && !stderr.isBlank() ? stderr.trim() : null;
            if (warning != null) {
                errorMsg = errorMsg != null ? warning + "\n" + errorMsg : warning;
            }

            return VisualizerResponse.builder()
                    .frames(frames)
                    .stdout(userStdout.isBlank() ? null : userStdout)
                    .error(errorMsg)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse frames JSON: {}", framesJson, e);
            return error("Failed to parse frames — make sure snapshot() receives a valid JSON-serializable object.\nDetail: " + e.getMessage());
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