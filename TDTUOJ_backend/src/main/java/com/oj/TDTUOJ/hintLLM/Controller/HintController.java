package com.oj.TDTUOJ.hintLLM.Controller;

import com.oj.TDTUOJ.hintLLM.HintRequest;
import com.oj.TDTUOJ.hintLLM.Service.HintService;
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

/**
 * REST entry point for AI-generated problem hints ({@code POST /api/hints}).
 *
 * <p>Dispatches to one of several LLM-backed {@link HintService} implementations
 * chosen at request time by the {@code model} field. Each provider registers
 * itself as a Spring bean whose name is the model key ("gemini", "claude",
 * "openai"), so Spring injects them all as a name→bean map and this controller
 * only has to look one up — adding a provider needs no change here.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/hints")
public class HintController {

    /** All hint providers keyed by bean name (= model key); populated by Spring. */
    private final Map<String, HintService> hintServices;

    @PostMapping
    public ResponseEntity<Response<String>> getHint(@RequestBody HintRequest request) {
        // Default to Gemini when the client omits/blanks the model field.
        String modelKey = (request.getModel() != null && !request.getModel().isBlank())
                ? request.getModel().toLowerCase()
                : "gemini";

        // Unknown model key → 400 rather than a null-pointer downstream.
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