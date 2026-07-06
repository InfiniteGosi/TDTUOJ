package com.oj.TDTUOJ.visualizer.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;
import com.oj.TDTUOJ.visualizer.service.VisualizerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoint for the data-structure visualizer.
 *
 * <p>Exposes a single {@code POST /api/visualize} that instruments and traces
 * user code. The heavy lifting (instrumentation, Judge0 execution, frame
 * parsing, LLM classification) lives in {@link VisualizerService}.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/visualize")
public class VisualizerController {

    private final VisualizerService visualizerService;

    /**
     * Trace a source-code run. The service always returns HTTP 200; failures are
     * conveyed in the response body's {@code error} field, so the endpoint itself
     * does not distinguish success from user/runtime errors at the status level.
     */
    @PostMapping
    public ResponseEntity<Response<VisualizerResponse>> visualize(
            @RequestBody VisualizerRequest request) {
        return ResponseEntity.ok(visualizerService.visualize(request));
    }
}