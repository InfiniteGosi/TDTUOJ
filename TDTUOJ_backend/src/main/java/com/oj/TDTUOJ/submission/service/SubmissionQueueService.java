package com.oj.TDTUOJ.submission.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;


@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionQueueService {

    private static final String QUEUE_KEY    = "submissions:queue";
    private static final String POSITION_KEY = "submissions:position:";
    private static final String COOLDOWN_KEY = "submissions:cooldown:";
    private static final int COOLDOWN_SECONDS = 5;

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper                  objectMapper;
    private final MeterRegistry                 meterRegistry;

    @PostConstruct
    void registerQueueDepthGauge() {
        Gauge.builder("submissions.queue.depth", redisTemplate, rt -> {
                    Long size = rt.opsForList().size(QUEUE_KEY);
                    return size != null ? size : 0;
                })
                .description("Number of submissions waiting in the Redis judging queue")
                .register(meterRegistry);
    }

    public void enqueue(SubmissionJobDTO job) {
        // 1. Push job to queue
        Long queueSize = redisTemplate.opsForList().rightPush(QUEUE_KEY, job);

        // 2. Store this submission's position (1-based) — expires in 1 hour
        long position = queueSize != null ? queueSize : 1;
        redisTemplate.opsForValue().set(
                POSITION_KEY + job.getSubmissionId(),
                position,
                1, TimeUnit.HOURS
        );

        log.info("Enqueued submissionId={} at position={}", job.getSubmissionId(), position);
    }

    public SubmissionJobDTO dequeue() {
        Object raw = redisTemplate.opsForList().leftPop(QUEUE_KEY, 5, TimeUnit.SECONDS);
        if (raw == null) return null;
        return objectMapper.convertValue(raw, SubmissionJobDTO.class);
    }

    public int getQueuePosition(Long submissionId) {
        Object raw = redisTemplate.opsForValue().get(POSITION_KEY + submissionId);
        if (raw == null) return 0;
        return Integer.parseInt(raw.toString());
    }

    public void clearPosition(Long submissionId) {
        redisTemplate.delete(POSITION_KEY + submissionId);
    }

    public boolean isOnCooldown(Long userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(COOLDOWN_KEY + userId));
    }

    public void setCooldown(Long userId) {
        redisTemplate.opsForValue().set(
                COOLDOWN_KEY + userId,
                "1",
                COOLDOWN_SECONDS, TimeUnit.SECONDS
        );
    }

    public int getCooldownSeconds() {
        return COOLDOWN_SECONDS;
    }
}