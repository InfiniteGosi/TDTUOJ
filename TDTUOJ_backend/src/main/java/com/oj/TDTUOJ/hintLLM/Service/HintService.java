package com.oj.TDTUOJ.hintLLM.Service;

import com.oj.TDTUOJ.hintLLM.HintRequest;

/**
 * Strategy for generating a problem hint from an LLM. Implementations are registered as
 * named Spring beans ({@code "gemini"}, {@code "claude"}, {@code "openai"}) and dispatched
 * by {@code HintController} based on {@link HintRequest#getModel()}.
 */
public interface HintService {
    /** Returns the assistant's hint text (guarded: must not reveal a full solution). */
    String getHint(HintRequest request);
}
