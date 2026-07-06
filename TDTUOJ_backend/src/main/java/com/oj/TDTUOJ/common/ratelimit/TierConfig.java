package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Per-tier rate-limit policy: the token budget, its refill window, and the request patterns the
 * tier applies to. A capacity of 0 is meaningful — it blocks that principal type outright.
 */
@Data
public class TierConfig {
    private long capacity = 60;             // tokens per window for anonymous (IP-keyed) callers
    private long windowSeconds = 60;        // length of the refill window in seconds
    private long authenticatedCapacity = 120; // higher budget for logged-in (user-keyed) callers
    private List<PathRule> paths = new ArrayList<>(); // request patterns this tier matches (empty = none)
}
