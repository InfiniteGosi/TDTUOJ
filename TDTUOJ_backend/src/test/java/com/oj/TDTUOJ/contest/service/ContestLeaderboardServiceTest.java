package com.oj.TDTUOJ.contest.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestProblemRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.repository.LeaderboardCacheRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContestLeaderboardServiceTest {
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ObjectMapper objectMapper;
    @Mock private ContestRepository contestRepository;
    @Mock private ContestParticipationRepository participationRepository;
    @Mock private ContestProblemRepository contestProblemRepository;
    @Mock private LeaderboardCacheRepository leaderboardCacheRepository;
    @Mock private LeaderboardCacheHelper cacheHelper;

    @Mock private ZSetOperations<String, Object> zsetOps;
    @SuppressWarnings("rawtypes")
    @Mock private HashOperations hashOps;
    @Mock private ValueOperations<String, Object> valueOps;

    @InjectMocks private ContestLeaderboardService service;

    @Test
    void getUserRank_ReturnsMinusOne_WhenAbsent() {
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRank("contest:lb:1", "5")).thenReturn(null);
        assertEquals(-1L, service.getUserRank(1L, 5L));
    }

    @Test
    void getUserRank_ReturnsOneBased_WhenPresent() {
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRank("contest:lb:1", "5")).thenReturn(2L); // 0-based 2 → rank 3
        assertEquals(3L, service.getUserRank(1L, 5L));
    }

    @Test
    void getNeighbours_UserNotRanked_ReturnsEmpty() {
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRank("contest:lb:1", "5")).thenReturn(null);
        assertTrue(service.getNeighbours(1L, 5L, 5).isEmpty());
    }

    @Test
    void getLeaderboard_CacheHit_DeserializesAndReturns() throws Exception {
        Contest c = new Contest();
        c.setId(1L);
        c.setEndTime(java.time.LocalDateTime.now().plusHours(1)); // running, no freeze

        String cachedJson = "{\"contestId\":1}";
        LeaderboardDTO cached = LeaderboardDTO.builder().contestId(1L).build();
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("contest:lb:cache:1")).thenReturn(cachedJson);
        when(objectMapper.readValue(cachedJson, LeaderboardDTO.class)).thenReturn(cached);

        LeaderboardDTO result = service.getLeaderboard(1L, 0, 10, false);

        assertSame(cached, result);
    }

    @Test
    void getLeaderboard_CacheMiss_BuildsFromZSetAndCaches() throws Exception {
        Contest c = new Contest();
        c.setId(1L);
        c.setName("Round X");
        c.setSlug("round-x");

        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("contest:lb:cache:1")).thenReturn(null);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.size("contest:lb:1")).thenReturn(0L);
        when(zsetOps.reverseRangeWithScores(eq("contest:lb:1"), anyLong(), anyLong()))
                .thenReturn(Collections.emptySet());
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        LeaderboardDTO result = service.getLeaderboard(1L, 0, 10, false);

        assertEquals(1L, result.getContestId());
        assertEquals("Round X", result.getContestName());
        assertEquals(0, result.getTotalParticipants());
        verify(valueOps).set(eq("contest:lb:cache:1"), eq("{}"), eq(30L), eq(TimeUnit.SECONDS));
        verify(cacheHelper).persistSnapshot(1L, "{}", 0);
    }

    @Test
    void getLeaderboard_ContestMissing_ThrowsNotFound() {
        // Contest lookup now happens before the cache read
        when(contestRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.getLeaderboard(99L, 0, 10, false));
    }

    @Test
    void getLeaderboard_Frozen_PublicViewer_GetsFrozenSnapshot() throws Exception {
        Contest c = new Contest();
        c.setId(1L);
        c.setEndTime(java.time.LocalDateTime.now().plusMinutes(30));
        c.setFreezeDurationMinutes(60); // freeze window started 30 min ago

        String frozenJson = "{\"contestId\":1}";
        LeaderboardDTO full = LeaderboardDTO.builder().contestId(1L).build();
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("contest:lb:frozen:1")).thenReturn(frozenJson);
        when(objectMapper.readValue(frozenJson, LeaderboardDTO.class)).thenReturn(full);

        LeaderboardDTO result = service.getLeaderboard(1L, 0, 10, false);

        assertEquals(Boolean.TRUE, result.getFrozen());
        assertNotNull(result.getFrozenAt());
        verify(valueOps, never()).get("contest:lb:cache:1"); // live cache untouched
    }

    @Test
    void getLeaderboard_Frozen_PrivilegedViewer_GetsLiveBoard() throws Exception {
        Contest c = new Contest();
        c.setId(1L);
        c.setEndTime(java.time.LocalDateTime.now().plusMinutes(30));
        c.setFreezeDurationMinutes(60);

        String cachedJson = "{\"contestId\":1}";
        LeaderboardDTO cached = LeaderboardDTO.builder().contestId(1L).build();
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("contest:lb:cache:1")).thenReturn(cachedJson);
        when(objectMapper.readValue(cachedJson, LeaderboardDTO.class)).thenReturn(cached);

        LeaderboardDTO result = service.getLeaderboard(1L, 0, 10, true);

        assertSame(cached, result);
        assertNotEquals(Boolean.TRUE, result.getFrozen());
    }

    @Test
    void recordAcceptedSubmission_UpdatesZSetAndInvalidatesCache() throws Exception {
        when(redisTemplate.hasKey("contest:lb:1")).thenReturn(Boolean.TRUE);
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        // 3 solved, 60 penalty → composite = 3*1_000_000 - 60 = 2_999_940
        service.recordAcceptedSubmission(1L, 5L, "u5", "url",
                10L, 1, 60, 3, new com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO.ProblemScoreDTO());

        ArgumentCaptor<Double> scoreCap = ArgumentCaptor.forClass(Double.class);
        verify(zsetOps).add(eq("contest:lb:1"), eq("5"), scoreCap.capture());
        assertEquals(2_999_940.0, scoreCap.getValue());
        verify(redisTemplate).delete("contest:lb:cache:1");
    }
}
