package com.oj.TDTUOJ.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.Executor;

/**
 * Central async/scheduling configuration.
 *
 * <p>Enables {@code @Scheduled} tasks and {@code @Async} method execution, and defines the
 * two thread pools the app relies on: a scheduler for the submission-judging workers and a
 * separate executor for fire-and-forget leaderboard persistence. Keeping these pools distinct
 * prevents slow leaderboard writes from starving the judging pipeline.
 */
@Configuration
@EnableScheduling
@EnableAsync
public class AsyncConfig {

    /**
     * Scheduler backing the periodic submission-polling workers.
     *
     * <p>Pool size is deliberately pinned to the number of Judge0 workers so we never schedule
     * more concurrent polling loops than the execution engine can serve.
     */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2); // matches number of Judge0 workers
        scheduler.setThreadNamePrefix("submission-worker-");
        scheduler.initialize();
        return scheduler;
    }

    /**
     * Dedicated thread pool for async leaderboard DB persistence.
     * Named "leaderboardExecutor" so {@code @Async} methods can target it explicitly.
     */
    @Bean(name = "leaderboardExecutor")
    public Executor leaderboardExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("leaderboard-async-");
        executor.initialize();
        return executor;
    }
}