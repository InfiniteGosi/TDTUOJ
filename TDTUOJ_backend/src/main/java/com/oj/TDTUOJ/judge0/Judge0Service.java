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

@Service
@RequiredArgsConstructor
@Slf4j
public class Judge0Service {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;

    private static final Map<SubmissionLanguage, Integer> LANGUAGE_MAP = Map.of(
            SubmissionLanguage.C,      50,
            SubmissionLanguage.CPP,    54,
            SubmissionLanguage.JAVA,   62,
            SubmissionLanguage.PYTHON, 71
    );

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
        body.put("stdin",           encode(stdin != null ? stdin : ""));
        body.put("expected_output", encode(expectedOutput != null ? expectedOutput : ""));
        body.put("cpu_time_limit",  timeLimit != null ? timeLimit : 2.0);
        body.put("memory_limit",    memoryLimit != null ? memoryLimit * 1024 : 262144);

        log.info("Submitting to Judge0: language={}, timeLimit={}, memoryLimit={}",
                language, timeLimit, memoryLimit);

        Map response = client.post()
                .uri("/submissions?base64_encoded=true&wait=true")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        log.info("Judge0 response: {}", response);

        return parseResult(response);
    }

    private Judge0Result parseResult(Map response) {
        if (response == null) {
            log.error("Null response from Judge0");
            return new Judge0Result(SubmissionVerdict.WA, "No response from judge", null, null);
        }

        int statusId = (int) ((Map) response.get("status")).get("id");
        log.info("Judge0 status id: {}", statusId);

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
        String stderr        = decode(response.get("stderr"));

        String errorMessage = compileOutput != null ? compileOutput
                : stderr != null        ? stderr
                : null;

        Double time    = response.get("time") != null
                ? Double.parseDouble(response.get("time").toString()) : null;
        Integer memory = response.get("memory") != null
                ? (Integer) response.get("memory") : null;

        return new Judge0Result(verdict, errorMessage, time, memory);
    }

    private String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes());
    }

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