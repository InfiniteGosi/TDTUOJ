package com.oj.TDTUOJ.common.config;

import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.repository.configuration.EnableRedisRepositories;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis wiring for the two distinct ways the app uses Redis: Bucket4j rate limiting and
 * general-purpose caching/leaderboard storage via {@link RedisTemplate}.
 */
@Configuration
public class RedisConfig {

    /**
     * Proxy manager that backs Bucket4j distributed rate limiting on Redis.
     *
     * <p>It reuses the Spring-managed Lettuce connection factory but opens a dedicated
     * connection with a {@code String} key / {@code byte[]} value codec, because Bucket4j
     * stores each bucket's state as an opaque serialized byte blob rather than JSON.
     */
    @Bean
    public LettuceBasedProxyManager<String> rateLimitProxyManager(
            LettuceConnectionFactory lettuceConnectionFactory) {
        RedisClient redisClient = (RedisClient) lettuceConnectionFactory.getNativeClient();
        StatefulRedisConnection<String, byte[]> connection = redisClient.connect(
                RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));
        return LettuceBasedProxyManager.<String>builderFor(connection).build();
    }

    /**
     * General-purpose template for application caching and leaderboard (ZSET/HASH) operations.
     *
     * <p>String keys keep entries human-readable in redis-cli; values use JSON so cached POJOs
     * round-trip with type info, while hash fields use plain strings to match the raw
     * string members written by the leaderboard code.
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();

        // Key/value serializers for ZSET and String ops
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);

        // Hash key/value serializers for HSET/HGETALL ops
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
