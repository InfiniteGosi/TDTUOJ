package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.repository.LeaderboardCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Isolated component so that {@code @Async} + {@code @Transactional} are
 * applied via a real Spring proxy (self-invocation inside the same bean
 * would bypass both annotations).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LeaderboardCacheHelper {

    private final LeaderboardCacheRepository leaderboardCacheRepository;

    /**
     * Persists (or updates) the leaderboard JSON snapshot to the DB.
     * Runs in the async thread pool so the HTTP response is not delayed.
     */
    @Async("leaderboardExecutor")
    @Transactional
    public void persistSnapshot(Long contestId, String json, int totalUsers) {
        String type = "CONTEST:" + contestId;
        try {
            leaderboardCacheRepository.upsert(type, json, totalUsers);
        } catch (Exception e) {
            log.warn("Failed to persist leaderboard snapshot for contestId={}: {}", contestId, e.getMessage());
        }
    }
}
