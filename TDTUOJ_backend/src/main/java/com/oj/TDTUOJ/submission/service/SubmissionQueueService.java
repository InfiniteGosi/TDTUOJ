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


/**
 * Redis-backed judging queue plus per-submission position tracking and per-user submit cooldown.
 *
 * <p>Backing structures:
 * <ul>
 *   <li>a Redis list ({@code submissions:queue}) used as a FIFO of {@link SubmissionJobDTO}
 *       (right-push to enqueue, left-pop to dequeue);</li>
 *   <li>one key per pending submission ({@code submissions:position:<id>}) holding its 1-based
 *       queue position so clients can show "you are #N"; and</li>
 *   <li>one short-lived key per user ({@code submissions:cooldown:<id>}) enforcing a minimum gap
 *       between submissions.</li>
 * </ul>
 * Using Redis (rather than an in-memory queue) survives restarts and lets the queue be shared
 * across multiple app instances.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionQueueService {

    private static final String QUEUE_KEY    = "submissions:queue";
    private static final String POSITION_KEY = "submissions:position:";
    private static final String COOLDOWN_KEY = "submissions:cooldown:";
    /** Minimum seconds a user must wait between submissions (anti-spam / Judge0 protection). */
    private static final int COOLDOWN_SECONDS = 5;

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper                  objectMapper;
    private final MeterRegistry                 meterRegistry;

    /**
     * Registers a Micrometer gauge that reports live queue depth (list length) for monitoring,
     * so a growing backlog is visible in dashboards. Runs once after bean construction.
     */
    @PostConstruct
    void registerQueueDepthGauge() {
        Gauge.builder("submissions.queue.depth", redisTemplate, rt -> {
                    Long size = rt.opsForList().size(QUEUE_KEY);
                    return size != null ? size : 0;
                })
                .description("Number of submissions waiting in the Redis judging queue")
                .register(meterRegistry);
    }

    /**
     * Appends a job to the tail of the FIFO queue and records its position for client polling.
     * The new list length equals this job's 1-based position (it was just pushed to the tail).
     */
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

    /**
     * Blocking dequeue of the next job (head of the list), waiting up to 5 s for one to appear.
     * Returns {@code null} if the queue stayed empty for the whole wait, so the caller can loop.
     * Redis returns the value as a generic map, so it is converted back into a typed DTO.
     */
    public SubmissionJobDTO dequeue() {
        Object raw = redisTemplate.opsForList().leftPop(QUEUE_KEY, 5, TimeUnit.SECONDS);
        if (raw == null) return null;
        return objectMapper.convertValue(raw, SubmissionJobDTO.class);
    }

    /** Current 1-based queue position of a pending submission, or 0 if unknown/no longer queued. */
    public int getQueuePosition(Long submissionId) {
        Object raw = redisTemplate.opsForValue().get(POSITION_KEY + submissionId);
        if (raw == null) return 0;
        return Integer.parseInt(raw.toString());
    }

    /** Drops a submission's position key once the worker starts judging it (no longer waiting). */
    public void clearPosition(Long submissionId) {
        redisTemplate.delete(POSITION_KEY + submissionId);
    }

    /** True if the user submitted within the last {@link #COOLDOWN_SECONDS} (cooldown key present). */
    public boolean isOnCooldown(Long userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(COOLDOWN_KEY + userId));
    }

    /** Starts the cooldown window for a user; the key auto-expires after {@link #COOLDOWN_SECONDS}. */
    public void setCooldown(Long userId) {
        redisTemplate.opsForValue().set(
                COOLDOWN_KEY + userId,
                "1",
                COOLDOWN_SECONDS, TimeUnit.SECONDS
        );
    }

    /** Exposes the cooldown length so callers can surface it in a "wait N seconds" message. */
    public int getCooldownSeconds() {
        return COOLDOWN_SECONDS;
    }
}