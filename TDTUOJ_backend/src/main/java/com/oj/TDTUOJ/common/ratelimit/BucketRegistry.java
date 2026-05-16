package com.oj.TDTUOJ.common.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class BucketRegistry {

    private final RateLimitProperties properties;
    private final LettuceBasedProxyManager<String> rateLimitProxyManager;

    public Bucket getBucket(String tier, String key, boolean authenticated) {
        TierConfig config = properties.getTiers().getOrDefault(tier,
                properties.getTiers().getOrDefault("default", defaultTierConfig()));
        long capacity = authenticated ? config.getAuthenticatedCapacity() : config.getCapacity();
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        String redisKey = "rl:tier:" + tier + ":" + key;

        BucketConfiguration bucketConfig = BucketConfiguration.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, window)
                        .build())
                .build();

        return rateLimitProxyManager.builder().build(redisKey, () -> bucketConfig);
    }

    private TierConfig defaultTierConfig() {
        TierConfig fallback = new TierConfig();
        fallback.setCapacity(60);
        fallback.setAuthenticatedCapacity(120);
        fallback.setWindowSeconds(60);
        return fallback;
    }
}
