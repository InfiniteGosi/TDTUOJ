package com.oj.TDTUOJ.judge0;

import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Thin HTTP client over the self-hosted Judge0 CE engine used for actual
 * submission judging (as opposed to the visualizer, which drives Judge0
 * separately).
 *
 * <p>Every request is submitted with {@code base64_encoded=true&wait=true}, so
 * the call blocks until Judge0 finishes and returns the completed submission in
 * one round trip — no polling. Source, stdin and expected output are base64 so
 * arbitrary bytes survive JSON transport intact.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Judge0Service {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;

    // Judge0 CE language ids for the production judge. NOTE: CPP is id 54 here,
    // whereas the visualizer (VisualizerServiceImpl) deliberately uses id 76 —
    // the two paths want different compiler configs, so the mismatch is intentional.
    private static final Map<SubmissionLanguage, Integer> LANGUAGE_MAP = Map.of(
            SubmissionLanguage.C,          50,
            SubmissionLanguage.CPP,        54,
            SubmissionLanguage.JAVA,       62,
            SubmissionLanguage.PYTHON,     71,
            SubmissionLanguage.CSHARP,     51,
            SubmissionLanguage.JAVASCRIPT, 63
    );

    /**
     * Compile and run one submission against a single test case and return the
     * normalized verdict. Blocks (up to a 30s client timeout) on Judge0 via the
     * synchronous {@code wait=true} endpoint.
     *
     * @param timeLimit   CPU limit in seconds (defaults to 2.0 when {@code null})
     * @param memoryLimit limit in MB; converted to Judge0's KB unit (defaults to 256MB when {@code null})
     */
    public Judge0Result judge(String sourceCode,
                              SubmissionLanguage language,
                              String stdin,
                              String expectedOutput,
                              Double timeLimit,
                              Integer memoryLimit) {

        WebClient client = webClientBuilder
                .baseUrl(judge0Url)
                .build();

        Map<String, Object> body = new HashMap<>();
        body.put("source_code", encode(sourceCode));
        body.put("language_id", LANGUAGE_MAP.get(language));
        body.put("stdin", encode(stdin != null ? stdin : ""));
        body.put("expected_output", encode(expectedOutput != null ? expectedOutput : ""));
        body.put("cpu_time_limit", timeLimit != null ? timeLimit : 2.0);
        // Judge0 expects memory in KB; the domain limit is MB, hence *1024 (default 256MB = 262144KB).
        body.put("memory_limit", memoryLimit != null ? memoryLimit * 1024 : 262144);

        log.info("Submitting to Judge0: language={}, timeLimit={}, memoryLimit={}",
                language, timeLimit, memoryLimit);

        Map response = client.post()
                .uri("/submissions?base64_encoded=true&wait=true")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(java.time.Duration.ofSeconds(30))
                .block();

        log.info("Judge0 response: {}", response);

        return parseResult(response);
    }

    /** Translate the raw Judge0 submission JSON into a {@link Judge0Result}. */
    private Judge0Result parseResult(Map response) {
        if (response == null) {
            log.error("Null response from Judge0");
            return new Judge0Result(SubmissionVerdict.WA, "No response from judge", null, null);
        }

        int statusId = (int) ((Map) response.get("status")).get("id");
        log.info("Judge0 status id: {}", statusId);

        // Judge0 status ids: 3=Accepted, 4=Wrong Answer, 5=Time Limit Exceeded,
        // 6=Compilation Error, 7-12 = runtime errors / internal / exec format (SIGSEGV,
        // SIGXFSZ, SIGFPE, SIGABRT, NZEC, "other") — all folded into a single SF verdict.
        SubmissionVerdict verdict = switch (statusId) {
            case 3           -> SubmissionVerdict.AC;
            case 4           -> SubmissionVerdict.WA;
            case 5           -> SubmissionVerdict.TLE;
            case 6           -> SubmissionVerdict.CE;
            case 7, 8, 9,
                 10, 11, 12  -> SubmissionVerdict.SF;
            default          -> SubmissionVerdict.WA;
        };

        String compileOutput = decode(response.get("compile_output"));
        String stderr = decode(response.get("stderr"));

        // Prefer compile output (it explains a CE); otherwise fall back to stderr (runtime error).
        String errorMessage = compileOutput != null ? compileOutput
                : stderr != null ? stderr
                : null;

        Double time = response.get("time") != null
                ? Double.parseDouble(response.get("time").toString()) : null;
        Integer memory = response.get("memory") != null
                ? (Integer) response.get("memory") : null;

        return new Judge0Result(verdict, errorMessage, time, memory);
    }

    /** Base64-encode a payload for Judge0's {@code base64_encoded=true} transport. */
    private String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes());
    }

    /** Base64-decode a Judge0 field, tolerating missing/garbled values. */
    private String decode(Object value) {
        if (value == null) return null;
        try {
            // Remove newlines — Judge0 Docker splits base64 across multiple lines
            String cleaned = value.toString().replaceAll("\\s+", "");
            return new String(Base64.getDecoder().decode(cleaned));
        } catch (Exception e) {
            log.warn("Failed to base64 decode value, returning as-is: {}", value);
            return value.toString();
        }
    }
}