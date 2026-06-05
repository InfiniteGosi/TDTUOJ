# TDTUOJ Monitoring (Prometheus + Grafana)

Live metrics for the backend, used for stress-test demos during the thesis defense.

```
k6 (load) → Spring Boot :8090 → /actuator/prometheus → Prometheus :9090 → Grafana :3000
```

## Start

```powershell
# 1. backend must be running on :8090 (Prometheus scrapes host.docker.internal:8090)
#    for the submission/queue demo, disable rate limiting:
#    $env:RATELIMIT_ENABLED='false'; ./mvnw spring-boot:run

# 2. monitoring stack
cd monitoring
docker compose up -d
```

- Grafana: http://localhost:3000 (admin / admin) → dashboard **TDTUOJ — Load & Health**
- Prometheus: http://localhost:9090 → Status → Targets (job `tdtuoj` should be UP)
- Raw metrics: http://localhost:8090/actuator/prometheus

## Run a stress scenario (watch the dashboard live)

```powershell
cd tests/k6/stress
.\run-stress.ps1 -Scenario browse
.\run-stress.ps1 -Scenario submit -Email <email> -Password <pw> -ProblemId 3
.\run-stress.ps1 -Scenario ratelimit
```

## Panels → defense story

| Row        | Panels                                             | Shows |
|------------|----------------------------------------------------|-------|
| HTTP       | req/s, p95 latency by URI, 4xx/5xx rate            | throughput & responsiveness under load |
| JVM        | heap used/max, GC pause rate, live threads         | resource pressure |
| Rate limit | allowed vs denied per tier                         | protection holds during a burst |
| Judging    | queue depth, judged/s by verdict, judge p95        | async worker absorbs submission spikes |

## Custom metrics (emitted by the backend)

| Metric                                   | Source |
|------------------------------------------|--------|
| `submissions_queue_depth`                | `SubmissionQueueService` gauge (Redis list size) |
| `submissions_judged_total{verdict}`      | `SubmissionJudgeService.judge()` counter |
| `submissions_judge_duration_seconds_*`   | `SubmissionJudgeService.judge()` timer |
| `ratelimit_allowed_total{tier}` / `ratelimit_denied_total{tier}` | `RateLimitMetrics` (pre-existing) |

## Stop

```powershell
cd monitoring
docker compose down
```
