package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;

/**
 * A single method+path matcher used to bind a tier to specific endpoints.
 */
@Data
public class PathRule {
    private String method = "*";  // HTTP method to match; "*" matches any method
    private String pattern;       // Ant-style path pattern (e.g. "/api/submissions/**")
}
