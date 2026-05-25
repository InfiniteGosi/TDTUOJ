package com.oj.TDTUOJ.submission.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionQueueServiceTest {
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ObjectMapper objectMapper;
    @Mock private ListOperations<String, Object> listOps;
    @Mock private ValueOperations<String, Object> valueOps;

    @InjectMocks private SubmissionQueueService queueService;

    @Test
    void isOnCooldown_True_WhenKeyExists() {
        when(redisTemplate.hasKey("submissions:cooldown:42")).thenReturn(Boolean.TRUE);
        assertTrue(queueService.isOnCooldown(42L));
    }

    @Test
    void isOnCooldown_False_WhenKeyMissing() {
        when(redisTemplate.hasKey("submissions:cooldown:42")).thenReturn(Boolean.FALSE);
        assertFalse(queueService.isOnCooldown(42L));
    }

    @Test
    void isOnCooldown_False_WhenNull() {
        when(redisTemplate.hasKey("submissions:cooldown:42")).thenReturn(null);
        assertFalse(queueService.isOnCooldown(42L));
    }

    @Test
    void getCooldownSeconds_ReturnsConfiguredValue() {
        assertEquals(5, queueService.getCooldownSeconds());
    }

    @Test
    void enqueue_PushesAndStoresPosition() {
        // given
        SubmissionJobDTO job = SubmissionJobDTO.builder()
                .submissionId(7L)
                .build();
        when(redisTemplate.opsForList()).thenReturn(listOps);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(listOps.rightPush("submissions:queue", job)).thenReturn(3L);

        // when
        queueService.enqueue(job);

        // then
        verify(listOps).rightPush("submissions:queue", job);
        verify(valueOps).set(eq("submissions:position:7"), eq(3L), eq(1L), eq(TimeUnit.HOURS));
    }

    @Test
    void setCooldown_SetsKeyWithTTL() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        queueService.setCooldown(99L);

        verify(valueOps).set(eq("submissions:cooldown:99"), eq("1"), eq(5L), eq(TimeUnit.SECONDS));
    }

    @Test
    void getQueuePosition_ReturnsZero_WhenMissing() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("submissions:position:5")).thenReturn(null);
        assertEquals(0, queueService.getQueuePosition(5L));
    }

    @Test
    void getQueuePosition_ParsesStoredValue() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("submissions:position:5")).thenReturn(8);
        assertEquals(8, queueService.getQueuePosition(5L));
    }

    @Test
    void clearPosition_DeletesKey() {
        queueService.clearPosition(11L);
        verify(redisTemplate).delete("submissions:position:11");
    }
}
