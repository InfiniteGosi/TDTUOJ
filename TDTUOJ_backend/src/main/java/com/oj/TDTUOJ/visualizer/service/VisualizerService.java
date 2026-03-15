package com.oj.TDTUOJ.visualizer.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;

public interface VisualizerService {
    Response<VisualizerResponse> visualize(VisualizerRequest request);
}