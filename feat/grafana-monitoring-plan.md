# Grafana Monitoring + Stress Test (thesis defense)

## Context
Defense needs a live, visual story: "hệ thống chịu tải ra sao?". The backend already has
Spring Boot Actuator (`management.endpoints.web.exposure.include: '*'`) and a Micrometer
class `RateLimitMetrics` emitting `ratelimit_allowed/denied_total{tier}`. Missing: a
Prometheus registry (no `/actuator/prometheus` endpoint yet), a Prometheus + Grafana stack,
OJ-specific metrics, and a load generator wired to the existing k6 setup. This plan adds all
four so a k6 stress run can be watched live in Grafana and screenshotted for the thesis.

**Defense narrative (3 scenarios):**
1. **Submission/judging load** — Redis queue (`submissions:queue`) depth grows then drains +
   judge throughput per verdict → proves the async worker absorbs spikes.
2. **Rate-limit burst** — allowed vs denied per tier → proves protection holds under attack.
3. **Read-heavy browsing** — RPS, p95/p99 latency, error rate, JVM heap/GC under load.

## Architecture
```
k6 (load) ─► Spring Boot :8090 ─(Micrometer)─► /actuator/prometheus
                                                      ▲ scrape 5s
                                            Prometheus :9090 ─► Grafana :3000 (dashboards)
```

## Part A — Backend metrics (small edits)
1. **Add registry** — `TDTUOJ_backend/pom.xml`:
   `io.micrometer:micrometer-registry-prometheus` (runtime). Auto-exposes
   `/actuator/prometheus` (already covered by `include: '*'`).
2. **App tag** — `application.yml`, under `management:` add `metrics.tags.application: tdtuoj`.
3. **Custom metrics** (reuse the `RateLimitMetrics` pattern — inject `MeterRegistry`):
   - **Queue depth gauge** in `submission/service/SubmissionQueueService.java`: register
     `Gauge.builder("submissions.queue.depth", redisTemplate, t -> opsForList().size(QUEUE_KEY))`
     in the constructor / `@PostConstruct`. → Prometheus `submissions_queue_depth`.
   - **Verdict counter + judge timer** in `submission/service/SubmissionJudgeService.java`
     `judge(job)` (line 61): start a `Timer.Sample` at entry; after `finalVerdict` is set
     (~line 111/120) increment
     `meterRegistry.counter("submissions.judged","verdict",finalVerdict.name())` and
     `sample.stop(Timer.builder("submissions.judge.duration")...)`.
     → `submissions_judged_total{verdict}`, `submissions_judge_duration_seconds_*`.
   - Keep edits minimal; wrap metric calls in try/finally so judging never breaks on a metric
     error.

## Part B — Monitoring stack (new, isolated; no app dependency)
New folder `monitoring/`:
- `docker-compose.yml` — `prom/prometheus` (:9090, mounts prometheus.yml) +
  `grafana/grafana` (:3000, `GF_SECURITY_ADMIN_PASSWORD=admin`, mounts provisioning).
- `prometheus.yml` — scrape job `tdtuoj`, `metrics_path: /actuator/prometheus`, target
  `host.docker.internal:8090`, `scrape_interval: 5s`.
- `grafana/provisioning/datasources/prometheus.yml` — Prometheus datasource
  `http://prometheus:9090`, default.
- `grafana/provisioning/dashboards/dashboard.yml` + `dashboards/tdtuoj.json` — auto-load a
  custom dashboard so panels exist on first boot (no manual import during defense).

## Part C — Dashboard panels (PromQL)
One dashboard `TDTUOJ — Load & Health`, rows per scenario:
- **HTTP**: RPS `sum(rate(http_server_requests_seconds_count[1m]))`; p95
  `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[1m])) by (le,uri))`;
  error rate `sum(rate(http_server_requests_seconds_count{status=~"5.."}[1m]))`.
- **JVM**: `jvm_memory_used_bytes{area="heap"}`; GC `rate(jvm_gc_pause_seconds_sum[1m])`;
  `jvm_threads_live_threads`.
- **Rate limit**: `sum(rate(ratelimit_allowed_total[1m])) by (tier)` vs
  `sum(rate(ratelimit_denied_total[1m])) by (tier)`.
- **Judging**: `submissions_queue_depth` over time;
  `sum(rate(submissions_judged_total[1m])) by (verdict)`; judge p95
  `histogram_quantile(0.95, sum(rate(submissions_judge_duration_seconds_bucket[1m])) by (le))`.
- (Optional) import community JVM dashboard ID **4701** / **17175** as a backup.

## Part D — k6 stress scenarios (reuse `tests/k6/utils.js`: `login`, `BASE_URL`)
New `tests/k6/stress/`:
- `browse.js` — ramping-VUs on public GET (`/problems`, `/problems/:slug`, `/contests`);
  stages ramp 0→N→0 over ~3–5 min.
- `submit.js` — authed (`login()`), POST submissions in a loop to flood `submissions:queue`;
  watch depth grow then drain. Respects the 5s cooldown → cycle multiple problems or accept
  queueing.
- `ratelimit-burst.js` — hammer an `ai`/`auth` tier past capacity to drive the denied counter.
- `run-stress.ps1` — wraps `C:\Program Files\k6\k6.exe`, takes `-Email/-Password`, runs a
  chosen scenario (mirrors existing `tests/k6/run-all.ps1`).

## Part E — Defense runbook (live demo) + thesis figures
1. Start stack: Postgres + Redis (already running), Judge0, backend `:8090`, `monitoring/`
   compose.
2. Open Grafana `localhost:3000` dashboard, range "last 15m", auto-refresh 5s.
3. Run a k6 scenario; narrate panels moving live (queue grow/drain, denied spike, p95 rise).
4. Capture PNGs → `Thesis/final/figures/grafana-*.png` for a future "Giám sát & kiểm thử tải"
   subsection in Chương 5 (Cài đặt và kiểm thử).

## Verification
- `cd TDTUOJ_backend && ./mvnw compile -q` → 0 errors after metric edits.
- `curl localhost:8090/actuator/prometheus | grep -E "submissions_|ratelimit_|http_server"`
  → all series present.
- Prometheus `:9090/targets` → tdtuoj job UP.
- Grafana panels populate; run k6 and confirm queue depth + denied counters move.
- Stop services started for the run (backend, monitoring compose) afterwards; leave the
  user's Judge0 / database containers.

## Files
- Edit: `TDTUOJ_backend/pom.xml`, `TDTUOJ_backend/src/main/resources/application.yml`,
  `.../submission/service/SubmissionQueueService.java`,
  `.../submission/service/SubmissionJudgeService.java`.
- New: `monitoring/` (compose + prometheus.yml + grafana provisioning + dashboard json),
  `tests/k6/stress/` (3 scenarios + run-stress.ps1).

## Out of scope
- Production/remote monitoring, alerting (Alertmanager), log aggregation (Loki).
- Writing the thesis subsection text (separate task) — only capture figures here.
