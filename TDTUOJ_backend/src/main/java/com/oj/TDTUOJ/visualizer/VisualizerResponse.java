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
    private List<Map<String, Object>> frames;  // raw — user defines shape inside snapshot()
    private String stdout;                     // any print() output outside snapshot
    private String error;                      // compile error / runtime error
}