package com.oj.TDTUOJ.visualizer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;
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

    // ── Public entry point ────────────────────────────────────────────────────

    @Override
    public Response<VisualizerResponse> visualize(VisualizerRequest request) {
        validateRequest(request);

        String instrumented = instrument(request.getSourceCode(), request.getLanguage());
        log.info("Visualizing: language={}, codeLength={}", request.getLanguage(),
                request.getSourceCode().length());

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

    // ── Judge0 submission ─────────────────────────────────────────────────────

    private Map<?, ?> submitToJudge0(String code, SubmissionLanguage language, String stdin) {
        Map<String, Object> body = new HashMap<>();
        body.put("source_code",    encode(code));
        body.put("language_id",    LANG_ID.get(language));
        body.put("stdin",          encode(stdin != null ? stdin : ""));
        body.put("cpu_time_limit", 10.0);
        body.put("memory_limit",   262144);  // KB — same default as Judge0Service (256 MB)

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
        if (response == null) {
            return error("No response from Judge0");
        }

        int statusId = extractStatusId(response);
        log.info("Judge0 visualizer status id: {}", statusId);

        // Compile error
        String compileOutput = decode(response.get("compile_output"));
        if (compileOutput != null && !compileOutput.isBlank()) {
            return error("Compile error:\n" + compileOutput.trim());
        }

        // Runtime error (but still try to parse stdout — partial frames are ok)
        String stderr = decode(response.get("stderr"));

        // TLE
        if (statusId == 5) {
            return error("Time limit exceeded — your algorithm may have too many snapshot() calls or an infinite loop");
        }

        String rawStdout = decode(response.get("stdout"));
        log.info("=== RAW STDOUT ===\n{}", rawStdout);  // ← add this
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

        // Program ran fine but user never called snapshot()
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

            return VisualizerResponse.builder()
                    .frames(frames)
                    .stdout(userStdout.isBlank() ? null : userStdout)
                    // surface stderr as a warning if frames still parsed ok
                    .error(stderr != null && !stderr.isBlank() ? stderr.trim() : null)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse frames JSON: {}", framesJson, e);
            return error("Failed to parse frames — make sure snapshot() receives a valid JSON-serializable object.\nDetail: " + e.getMessage());
        }
    }

    // ── Instrumentation ───────────────────────────────────────────────────────

    private String instrument(String code, SubmissionLanguage lang) {
        return switch (lang) {
            case PYTHON -> instrumentPython(code);
            case JAVA   -> instrumentJava(code);
            case C      -> instrumentC(code);
            case CPP    -> instrumentCpp(code);
        };
    }

    private String instrumentPython(String code) {
        String preamble = """
                import json as _json, copy as _copy, atexit as _atexit, sys as _sys
                
                _frames = []
                
                def snapshot(state):
                    _frames.append(_copy.deepcopy(state))
                
                def _flush_frames():
                    print("__FRAMES__" + _json.dumps(_frames) + "__END__", flush=True)
                
                _atexit.register(_flush_frames)
                
                """;
        return preamble + code;
    }

    private String instrumentJava(String code) {
        // Strip any existing imports from user code and hoist them to the top
        StringBuilder userImports = new StringBuilder();
        StringBuilder userBody = new StringBuilder();

        for (String line : code.split("\n")) {
            if (line.trim().startsWith("import ")) {
                userImports.append(line).append("\n");
            } else {
                userBody.append(line).append("\n");
            }
        }

        String helper = """
            import java.util.*;
            
            class Snapshot {
                private static final StringBuilder _buf = new StringBuilder();
                private static boolean _first = true;
            
                static {
                    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                        System.out.println("__FRAMES__[" + _buf + "]__END__");
                        System.out.flush();
                    }));
                }
            
                public static void snapshot(String rawJson) {
                    if (!_first) _buf.append(',');
                    _buf.append(rawJson);
                    _first = false;
                }
            
                public static String jsonObj(Object... keyValues) {
                    StringBuilder sb = new StringBuilder("{");
                    for (int i = 0; i < keyValues.length - 1; i += 2) {
                        if (i > 0) sb.append(',');
                        sb.append('"').append(keyValues[i]).append('"').append(':');
                        sb.append(toJson(keyValues[i + 1]));
                    }
                    return sb.append('}').toString();
                }
            
                public static String jsonArr(int[] arr) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < arr.length; i++) {
                        if (i > 0) sb.append(',');
                        sb.append(arr[i]);
                    }
                    return sb.append(']').toString();
                }
            
                public static String jsonArr(List<?> list) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < list.size(); i++) {
                        if (i > 0) sb.append(',');
                        sb.append(toJson(list.get(i)));
                    }
                    return sb.append(']').toString();
                }
            
                public static String jsonIntArr(int... values) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < values.length; i++) {
                        if (i > 0) sb.append(',');
                        sb.append(values[i]);
                    }
                    return sb.append(']').toString();
                }
            
                public static String toJson(Object v) {
                    if (v == null)            return "null";
                    if (v instanceof Boolean) return v.toString();
                    if (v instanceof Number)  return v.toString();
                    if (v instanceof int[])   return jsonArr((int[]) v);
                    if (v instanceof List)    return jsonArr((List<?>) v);
                    if (v instanceof String) {
                        String s = (String) v;
                        String trimmed = s.trim();
                        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                            return trimmed;
                        }
                        return "\\"" + s.replace("\\\\", "\\\\\\\\")
                                        .replace("\\"", "\\\\\\"") + "\\"";
                    }
                    return "\\"" + v.toString().replace("\\\\", "\\\\\\\\")
                                    .replace("\\"", "\\\\\\"") + "\\"";
                }
            }
            
            """;

        // Final order: all imports first, then Snapshot class, then user code body
        return userImports + helper + userBody;
    }

    private String instrumentC(String code) {
        String preamble = """
                #include <stdio.h>
                #include <stdlib.h>
                #include <string.h>
                
                #define _FRAME_BUF_SIZE (8 * 1024 * 1024)  /* 8 MB */
                
                static char  _buf[_FRAME_BUF_SIZE];
                static int   _pos  = 0;
                static int   _first = 1;
                
                /*
                 * snapshot(json_string)
                 * Pass a raw JSON object string.
                 * Example: snapshot("{\\"type\\":\\"array\\",\\"data\\":[1,2,3]}");
                 */
                void snapshot(const char* json_state) {
                    if (!_first) { _buf[_pos++] = ','; }
                    _first = 0;
                    int len = (int)strlen(json_state);
                    if (_pos + len + 32 < _FRAME_BUF_SIZE) {
                        memcpy(_buf + _pos, json_state, len);
                        _pos += len;
                    }
                }
                
                static void _flush_frames(void) {
                    printf("__FRAMES__[%.*s]__END__\\n", _pos, _buf);
                    fflush(stdout);
                }
                
                __attribute__((constructor))
                static void _register_flush(void) { atexit(_flush_frames); }
                
                """;
        return preamble + code;
    }

    private String instrumentCpp(String code) {
        String preamble = """
            #include <iostream>
            #include <vector>
            #include <string>
            #include <utility>
            #include <cstdlib>
            
            struct J {
                std::string raw;
                J() : raw("null") {}
                J(int v)                { raw = std::to_string(v); }
                J(long v)               { raw = std::to_string(v); }
                J(double v)             { raw = std::to_string(v); }
                J(bool v)               { raw = v ? "true" : "false"; }
                J(const char* v)        { raw = std::string("\\"") + v + "\\""; }
                J(const std::string& v) { raw = "\\"" + v + "\\""; }
                template<typename T>
                J(const std::vector<T>& v) {
                    raw = "[";
                    for (size_t i = 0; i < v.size(); i++) {
                        if (i) raw += ",";
                        raw += J(v[i]).raw;
                    }
                    raw += "]";
                }
            };
            
            static std::string _frames_buf;
            static bool _frames_first = true;
            
            // Overload 1: initializer list — for simple snapshots
            void snapshot(std::initializer_list<std::pair<const char*, J>> fields) {
                std::string s = "{";
                bool first = true;
                for (auto it = fields.begin(); it != fields.end(); ++it) {
                    if (!first) s += ",";
                    s += "\\"" + std::string(it->first) + "\\":" + it->second.raw;
                    first = false;
                }
                s += "}";
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += s;
                _frames_first = false;
            }
            
            // Overload 2: raw const char* — for manually built JSON strings
            void snapshot(const char* rawJson) {
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += rawJson;
                _frames_first = false;
            }
            
            // Overload 3: std::string — same as above but for string variables
            void snapshot(const std::string& rawJson) {
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += rawJson;
                _frames_first = false;
            }
            
            struct _FrameFlusher {
                _FrameFlusher() {
                    atexit([]() {
                        std::cout << "__FRAMES__[" << _frames_buf << "]__END__" << std::endl;
                    });
                }
            };
            static _FrameFlusher _flusher;
            
            """;
        return preamble + code;
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