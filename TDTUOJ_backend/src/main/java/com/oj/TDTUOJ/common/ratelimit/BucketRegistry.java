package com.oj.TDTUOJ.common.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Builds/looks up Bucket4j buckets backed by Redis (via a Lettuce proxy manager), so limits are
 * shared across all app instances rather than being per-JVM. Bucket state lives in Redis, keyed by
 * tier + principal.
 */
@Component
@RequiredArgsConstructor
public class BucketRegistry {

    private final RateLimitProperties properties;
    private final LettuceBasedProxyManager<String> rateLimitProxyManager;

    /**
     * Resolves the distributed bucket for a (tier, principal) pair, creating it lazily on first use.
     *
     * @param authenticated selects the higher authenticated capacity vs. the anonymous capacity
     */
    public Bucket getBucket(String tier, String key, boolean authenticated) {
        // Two-level fallback so a request always maps to *some* config: named tier → "default" → hardcoded.
        TierConfig config = properties.getTiers().getOrDefault(tier,
                properties.getTiers().getOrDefault("default", defaultTierConfig()));
        long capacity = authenticated ? config.getAuthenticatedCapacity() : config.getCapacity();
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        // Namespaced Redis key: buckets are isolated per tier so different endpoints don't share a budget.
        String redisKey = "rl:tier:" + tier + ":" + key;

        // Greedy refill: tokens trickle back continuously over the window (capacity/window per unit
        // time) rather than all at once at the window boundary — smooths out bursty traffic.
        BucketConfiguration bucketConfig = BucketConfiguration.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, window)
                        .build())
                .build();

        // The supplier is only invoked when the bucket doesn't yet exist in Redis.
        return rateLimitProxyManager.builder().build(redisKey, () -> bucketConfig);
    }

    // Last-resort limits used only if neither the requested tier nor a "default" tier is configured.
    private TierConfig defaultTierConfig() {
        TierConfig fallback = new TierConfig();
        fallback.setCapacity(60);
        fallback.setAuthenticatedCapacity(120);
        fallback.setWindowSeconds(60);
        return fallback;
    }
}
