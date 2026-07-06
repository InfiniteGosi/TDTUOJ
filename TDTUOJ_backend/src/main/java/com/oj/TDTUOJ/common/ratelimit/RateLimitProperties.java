package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Externalized rate-limit configuration bound from the {@code ratelimit.*} config prefix.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ratelimit")
public class RateLimitProperties {
    private boolean enabled = true;      // master on/off switch for the whole limiter
    private boolean adminBypass = false; // when true, ADMIN principals skip limiting entirely
    private boolean hashIp = false;      // hash IPs before using them as keys (privacy / GDPR)
    // LinkedHashMap: insertion order is significant — RateLimitTierResolver matches tiers in this
    // declared order, so more specific tiers should be configured before broader ones.
    private Map<String, TierConfig> tiers = new LinkedHashMap<>();
}
