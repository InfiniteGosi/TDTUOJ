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

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/visualize")
public class VisualizerController {

    private final VisualizerService visualizerService;

    @PostMapping
    public ResponseEntity<Response<VisualizerResponse>> visualize(
            @RequestBody VisualizerRequest request) {
        return ResponseEntity.ok(visualizerService.visualize(request));
    }
}