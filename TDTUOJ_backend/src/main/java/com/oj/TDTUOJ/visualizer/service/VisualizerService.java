package com.oj.TDTUOJ.visualizer.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;

/**
 * Entry point for the data-structure visualizer: takes user source + language,
 * instruments it, runs it on Judge0, and returns the trace frame stream.
 *
 * @see com.oj.TDTUOJ.visualizer.service.tracer.Tracer for the emitted frame schema
 */
public interface VisualizerService {
    /**
     * @param request source code, language and optional stdin
     * @return the frame stream plus stdout/error/warning; always HTTP 200 with an
     *         {@code error} message inside the payload when a run fails (never throws for
     *         user code errors or Judge0 unavailability)
     */
    Response<VisualizerResponse> visualize(VisualizerRequest request);
}