package com.oj.TDTUOJ.common.ratelimit;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Configuration
@ConfigurationProperties(prefix = "ratelimit")
public class RateLimitProperties {
    private boolean enabled = true;
    private boolean adminBypass = false;
    private boolean hashIp = false;
    private Map<String, TierConfig> tiers = new LinkedHashMap<>();
}
