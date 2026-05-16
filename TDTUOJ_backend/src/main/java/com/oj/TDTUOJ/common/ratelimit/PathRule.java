package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;

@Data
public class PathRule {
    private String method = "*";
    private String pattern;
}
