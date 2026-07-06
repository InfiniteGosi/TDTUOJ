package com.oj.TDTUOJ.hintLLM;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Request body for an AI hint. Carries the problem context (title/statement) that scopes
 * what the assistant is allowed to answer, the user's question, optional current code/error
 * for targeted feedback, a {@code model} selector (gemini/claude/openai), and prior
 * {@code history} turns ({role, content} maps) for multi-turn conversations.
 */
@Data
public class HintRequest {
    private String problemTitle;
    private String problemStatement;
    private String userQuestion;
    private String model;
    private String currentCode;
    private String currentLanguage;
    private String errorMessage;
    private List<Map<String, String>> history;
}