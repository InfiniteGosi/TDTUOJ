package com.oj.TDTUOJ.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Configures the shared {@link WebClient.Builder} bean.
 *
 * <p>The default WebFlux codec buffer limit is 256 KB. BST / large-tree
 * visualization traces can easily exceed this. Raised to 10 MB.
 */
@Configuration
public class WebClientConfig {

    private static final int MAX_IN_MEMORY_SIZE = 10 * 1024 * 1024; // 10 MB

    @Bean
    public WebClient.Builder webClientBuilder() {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(config -> config.defaultCodecs().maxInMemorySize(MAX_IN_MEMORY_SIZE))
                .build();
        return WebClient.builder().exchangeStrategies(strategies);
    }
}
