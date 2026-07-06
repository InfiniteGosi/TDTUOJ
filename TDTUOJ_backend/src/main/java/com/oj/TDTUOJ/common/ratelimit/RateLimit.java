package com.oj.TDTUOJ.common.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller handler method with an explicit rate-limit tier, overriding path-based
 * resolution. Read reflectively by {@code RateLimitTierResolver}, so it must be retained at runtime.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    /** Name of the tier (must match a key under {@code ratelimit.tiers}) to apply to this endpoint. */
    String tier();
}
