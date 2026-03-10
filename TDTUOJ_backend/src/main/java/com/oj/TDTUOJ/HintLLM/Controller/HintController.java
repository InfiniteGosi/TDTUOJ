package com.oj.TDTUOJ.HintLLM.Controller;

import com.oj.TDTUOJ.HintLLM.HintRequest;
import com.oj.TDTUOJ.HintLLM.Service.HintService;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.response.Response;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/hints")
public class HintController {

    private final Map<String, HintService> hintServices;

    @PostMapping
    public ResponseEntity<Response<String>> getHint(@RequestBody HintRequest request) {
        String modelKey = (request.getModel() != null && !request.getModel().isBlank())
                ? request.getModel().toLowerCase()
                : "gemini";

        HintService hintService = hintServices.get(modelKey);
        if (hintService == null) {
            throw new BadRequestException("Unsupported model: " + modelKey);
        }

        String result = hintService.getHint(request);

        return ResponseEntity.ok(Response.<String>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Hint retrieved successfully")
                .data(result)
                .build());
    }
}