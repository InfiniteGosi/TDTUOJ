package com.oj.TDTUOJ.common.ratelimit;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for the rate limiter, exported via Actuator/Prometheus for the monitoring
 * dashboards. Allowed/denied are tagged by tier so traffic can be broken down per endpoint policy.
 */
@Component
@RequiredArgsConstructor
public class RateLimitMetrics {
    private final MeterRegistry meterRegistry;

    // Tagged by tier so Grafana can show allow/deny rates per endpoint policy.
    public void recordAllowed(String tier) {
        meterRegistry.counter("ratelimit.allowed", "tier", tier).increment();
    }

    public void recordDenied(String tier) {
        meterRegistry.counter("ratelimit.denied", "tier", tier).increment();
    }

    // Untagged: counts fail-open events (Redis unreachable) — a spike signals a limiter outage.
    public void recordRedisError() {
        meterRegistry.counter("ratelimit.redis.errors").increment();
    }
}
