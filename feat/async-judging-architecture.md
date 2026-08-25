# TDTUOJ — Async Judging Architecture

![Async Judging Architecture](C:\Users\Admin\.gemini\antigravity\brain\deac7167-dccc-4438-ae22-194ffbba0cdc\async_judging_simple_1784552032889.png)

## Flow Summary

| Step | Component | Action |
|---|---|---|
| 1 | Browser | `POST /submissions` (source + language) |
| 2 | `SubmissionController` | Validates request, calls service |
| 3 | `SubmissionServiceImpl` | Saves submission as `PENDING` |
| 4 | `SubmissionQueueService` | `RPUSH submissions:queue` + position key + 5s cooldown key |
| 5 | HTTP Response | Returns `200 PENDING` immediately — **async boundary** |
| 6 | `SubmissionWorker` | `@Scheduled(fixedDelay=100ms)` polls via `BLPOP` (blocks 5s) |
| 7 | `SubmissionJudgeService` | Marks `RUNNING`, clears position key |
| 8 | AWS S3 | Fetches `input` + `expected_output` per test case |
| 9 | `Judge0Service` | `POST /submissions?wait=true&base64_encoded=true` (blocks ~30s per case) |
| 10 | Judge0 Workers | Compile + execute in sandbox (x86_64 only) |
| 11 | `SubmissionJudgeService` | Resolves verdict (first-failure wins: AC/WA/TLE/CE/SF/IE) |
| 12 | PostgreSQL | Persist final verdict, time, memory, test cases passed |
| 13 | `UserStatisticsService` | Record attempt, award points on first solve |
| 14 | `ContestLeaderboardService` | ICPC scoring → Redis sorted set (contest submissions only, AC only) |
| 15 | Micrometer/Prometheus | Increment `submissions.judged` counter, record `judge.duration` histogram |

## Redis Keys

| Key pattern | Type | TTL | Purpose |
|---|---|---|---|
| `submissions:queue` | List (FIFO) | — | Main judging queue |
| `submissions:position:<id>` | String | 1 hour | Queue position for client polling |
| `submissions:cooldown:<userId>` | String | 5 seconds | Anti-spam rate limit |
