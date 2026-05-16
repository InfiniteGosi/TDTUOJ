package com.oj.TDTUOJ.common.ratelimit;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RateLimitMetrics {
    private final MeterRegistry meterRegistry;

    public void recordAllowed(String tier) {
        meterRegistry.counter("ratelimit.allowed", "tier", tier).increment();
    }

    public void recordDenied(String tier) {
        meterRegistry.counter("ratelimit.denied", "tier", tier).increment();
    }

    public void recordRedisError() {
        meterRegistry.counter("ratelimit.redis.errors").increment();
    }
}
