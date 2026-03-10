package com.oj.TDTUOJ.HintLLM;

import lombok.Data;

import java.util.List;
import java.util.Map;

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