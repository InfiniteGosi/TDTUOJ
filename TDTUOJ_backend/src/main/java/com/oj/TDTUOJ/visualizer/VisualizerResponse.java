package com.oj.TDTUOJ.visualizer;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VisualizerResponse {
    /** Uniform frame stream — see {@link com.oj.TDTUOJ.visualizer.service.tracer.Tracer} schema. */
    private List<Map<String, Object>> frames;
    /** Full user stdout (frames carry cumulative {@code out_len} offsets into it where supported). */
    private String stdout;
    /** Compile error / runtime error text. */
    private String error;
    /** Non-fatal notices (frame truncation etc.). */
    private String warning;
    /** LLM variable classifications: name → {role, form, directed, confidence}. Empty when unavailable. */
    private Map<String, Object> classifications;
    /** Echo of the traced language (frontend renderer hints). */
    private String language;
}
