package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TierConfig {
    private long capacity = 60;
    private long windowSeconds = 60;
    private long authenticatedCapacity = 120;
    private List<PathRule> paths = new ArrayList<>();
}
