package com.oj.TDTUOJ.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.Executor;

@Configuration
@EnableScheduling
@EnableAsync
public class AsyncConfig {

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