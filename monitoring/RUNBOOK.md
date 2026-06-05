# TDTUOJ Monitoring — Run & Observe Runbook

Step-by-step guide to run the monitoring stack, drive load with k6, and read the
Grafana dashboard. Intended for the thesis-defense live demo.

```
k6 (load) → Spring Boot :8090 → /actuator/prometheus → Prometheus :9090 → Grafana :3000
```

## Credentials & URLs

| Service     | URL                              | Login          |
|-------------|----------------------------------|----------------|
| Grafana     | http://localhost:3000            | `admin` / `admin` |
| Prometheus  | http://localhost:9090            | (none)         |
| Raw metrics | http://localhost:8090/actuator/prometheus | (none) |

> First Grafana login may prompt to change the password → click **Skip**.

---

## 0. Prerequisites (one-time check)

```powershell
docker ps --format "{{.Names}} {{.Status}}"
```
Expect `tdtuoj` (PostgreSQL :5431) and `tdtuoj-redis` (:6379) **Up**.
Judge0 on :2358 is only needed for the **submit** scenario (real judging):
```powershell
curl http://localhost:2358/about
```
k6 binary expected at `C:\Program Files\k6\k6.exe`.

---

## 1. Start the backend  (Terminal A)

For the **submission/queue** demo, run with rate limiting OFF so the queue can fill:
```powershell
cd D:\OJ\TDTUOJ_backend
$env:RATELIMIT_ENABLED = 'false'
./mvnw spring-boot:run
```
Wait for `Started TdtuojApplication`. Confirm metrics are exposed:
```powershell
curl http://localhost:8090/actuator/prometheus | Select-String "submissions_queue_depth"
```

> For the **ratelimit** scenario instead, the limiter must be ON — start WITHOUT the
> env var: `Remove-Item Env:\RATELIMIT_ENABLED; ./mvnw spring-boot:run`.

---

## 2. Start Prometheus + Grafana  (Terminal B)

```powershell
cd D:\OJ\monitoring
docker compose up -d
docker ps --format "{{.Names}} {{.Status}}"   # tdtuoj-grafana + tdtuoj-prometheus = Up
```
Confirm Prometheus is scraping the backend:
- Open http://localhost:9090/targets → job **tdtuoj** shows **UP**.
  (If DOWN: the backend on :8090 isn't running — go back to step 1.)

---

## 3. Open the dashboard

1. http://localhost:3000 → log in `admin` / `admin` (Skip the password change).
2. Left menu → **Dashboards** → **TDTUOJ — Load & Health**.
3. Top-right: set range = **Last 15 minutes**, auto-refresh = **5s**.

Empty panels are normal until traffic flows (step 4).

---

## 4. Run a load scenario  (Terminal C) — watch the dashboard live

```powershell
cd D:\OJ\tests\k6\stress
```

### a) Read-heavy browsing
```powershell
.\run-stress.ps1 -Scenario browse            # optional: -Peak 200
```
**Watch (HTTP + JVM rows):** Request rate climbs, Latency p95 by URI rises, Heap/GC react.

### b) Submission / judging load  (backend rate limit OFF + Judge0 up)
```powershell
.\run-stress.ps1 -Scenario submit -Email khangho150@gmail.com -Password 123456 -ProblemId 3
```
**Watch (Judging row):** `Submission queue depth` grows during load then drains as the
worker catches up; `Judged rate by verdict` shows AC/WA/...; Judge latency p95.

### c) Rate-limit burst  (backend rate limit ON — see step 1 note)
```powershell
.\run-stress.ps1 -Scenario ratelimit          # optional: -Vus 100
```
**Watch (Rate limit row):** `Allowed by tier` stays flat at the cap while
`Denied by tier` spikes — proves the limiter holds under a flood.

> Order tip: do **browse** + **submit** in one backend run (limit off), then restart the
> backend with the limit ON and run **ratelimit**.

---

## 5. What each panel means

| Row        | Panel                      | Reads as |
|------------|----------------------------|----------|
| HTTP       | Request rate (req/s)       | throughput the API sustains |
| HTTP       | Latency p95 by URI         | responsiveness under load (per endpoint) |
| HTTP       | Error rate (4xx/5xx)       | failures appearing under stress |
| JVM        | Heap used / max            | memory pressure |
| JVM        | GC pause rate              | GC cost as load rises |
| JVM        | Live threads               | thread-pool / request concurrency |
| Rate limit | Allowed vs Denied by tier  | protection working during a burst |
| Judging    | Queue depth                | async worker absorbing submission spikes |
| Judging    | Judged rate by verdict     | judging throughput + verdict mix |
| Judging    | Judge latency p95          | per-submission judging time |

---

## 6. (Optional) Watch the Redis queue directly

```powershell
docker exec -it tdtuoj-redis redis-cli LLEN submissions:queue
```
Run repeatedly during the submit scenario to see the same number the gauge plots.

---

## 7. Teardown

```powershell
cd D:\OJ\monitoring
docker compose down
# Ctrl+C the backend terminal (Terminal A)
```
Prometheus/Grafana containers are removed; PostgreSQL + Redis are left untouched.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `http://localhost:3000` won't load | Stack not running → `cd D:\OJ\monitoring; docker compose up -d` |
| Grafana loads but all panels "No data" | Backend down, or Prometheus target DOWN → check http://localhost:9090/targets and step 1 |
| Prometheus target `tdtuoj` DOWN | Backend not on :8090, or `/actuator/prometheus` missing (rebuild backend) |
| `Denied by tier` stays 0 | Backend started with `RATELIMIT_ENABLED=false`; restart with limiter ON |
| `Submission queue depth` never grows | Rate limit ON capping at 10/min, or Judge0 down → set `RATELIMIT_ENABLED=false` + start Judge0 |
| submit scenario all 429 | same as above — limiter on |
| k6 not found | install path differs from `C:\Program Files\k6\k6.exe` |

---

## 8. Defense talking points

**Why this matters (open with this):**
"Một hệ thống chấm bài trực tuyến phải chịu tải đột biến — ví dụ hàng trăm sinh viên nộp
bài cùng lúc cuối kỳ thi. Đề tài không chỉ xây dựng chức năng mà còn đo lường (đo đạc) khả
năng chịu tải bằng kiểm thử tải (load test) với k6 và quan sát trực tiếp qua Grafana."

**Per-scenario narrative (say while the panel moves):**
- **Read load** — "API phục vụ ~N yêu cầu/giây, độ trễ p95 dưới X ms; bộ nhớ heap và GC
  vẫn ổn định → hệ thống đáp ứng tốt khi nhiều người duyệt bài cùng lúc."
- **Submission load** — "Đây là điểm cốt lõi: nộp bài được đẩy vào hàng đợi Redis và chấm
  bất đồng bộ. Khi tải tăng, độ sâu hàng đợi tăng rồi *giảm dần* khi worker xử lý kịp —
  chứng minh kiến trúc bất đồng bộ hấp thụ được đỉnh tải mà không làm nghẽn giao diện."
- **Rate-limit burst** — "Khi bị tấn công dồn dập, số yêu cầu *được chấp nhận* giữ ở mức
  trần còn số *bị từ chối* (HTTP 429) tăng vọt → cơ chế giới hạn tần suất bảo vệ hệ thống."

**Key design points to emphasize:**
- Chỉ tốn 4 chỉnh sửa nhỏ ở backend nhờ Micrometer + Spring Actuator có sẵn — không xâm
  lấn mã nghiệp vụ. Chỉ số chấm bài (`submissions_judge_duration`, hàng đợi) là *tự định
  nghĩa*, gắn trực tiếp với nghiệp vụ.
- Tách biệt hoàn toàn: stack giám sát chạy trong Docker, không phụ thuộc vào ứng dụng;
  có thể bật/tắt độc lập.
- Đo được cả ba lớp: HTTP (người dùng), JVM (tài nguyên), và nghiệp vụ (hàng đợi/chấm bài).

**Likely questions + answers:**
- *"Tại sao dùng Prometheus + Grafana?"* → chuẩn công nghiệp, kéo (pull-based) hợp với
  Actuator, truy vấn PromQL mạnh, dashboard mã hóa được (provisioning) nên tái lập được.
- *"Số liệu có đáng tin không?"* → đo từ chính ứng dụng qua Micrometer (không ước lượng);
  tải sinh bằng k6 có kịch bản ramp xác định, lặp lại được.
- *"Giới hạn của phép đo?"* → chạy cục bộ (một máy), backend + tải + Judge0 chia sẻ tài
  nguyên; con số mang tính so sánh tương đối, không phải năng lực sản xuất tuyệt đối.
- *"Làm sao chịu tải thật?"* → kiến trúc đã sẵn sàng mở rộng ngang: thêm worker, tách
  Judge0 ra máy riêng (xem chiến lược triển khai).

---

## 9. Thesis writing notes (Chương 5 — Cài đặt và kiểm thử)

Đề xuất mục con: **"Giám sát và kiểm thử tải"** (Monitoring & load testing).

**Bố cục gợi ý:**
1. *Mục tiêu* — vì sao cần đo hiệu năng và khả năng chịu tải của hệ thống chấm bài.
2. *Công cụ và phương pháp* — Spring Boot Actuator + Micrometer xuất chỉ số dạng
   Prometheus; Prometheus thu thập (scrape) định kỳ; Grafana trực quan hóa; k6 sinh tải
   theo kịch bản. Kèm sơ đồ luồng dữ liệu đo.
3. *Các chỉ số theo dõi* — bảng: tên chỉ số, ý nghĩa, lớp (HTTP / JVM / nghiệp vụ).
4. *Kịch bản kiểm thử tải* — ba kịch bản (duyệt bài, nộp bài, dồn tần suất) với cấu hình
   ramp; nêu rõ thông số (số người dùng ảo, thời lượng).
5. *Kết quả và nhận xét* — chèn ảnh Grafana từng kịch bản, đọc số liệu (req/s, p95, độ sâu
   hàng đợi), rút kết luận.

**Thuật ngữ (theo `THESIS-WRITING-GUIDE.md`, ghi Việt — Anh lần đầu):**
giám sát (monitoring), kiểm thử tải (load testing), chỉ số / số liệu đo (metrics), độ trễ
(latency), phân vị 95 (p95), thông lượng (throughput), hàng đợi (queue), người dùng ảo
(virtual user), giới hạn tần suất (rate limiting). Giữ nguyên: Grafana, Prometheus,
Micrometer, k6, JVM, HTTP, Redis, Judge0, Docker.

**Hình cần chụp (lưu vào `Thesis/final/figures/`):**
- `grafana-dashboard.png` — toàn cảnh bảng điều khiển (đã có).
- `grafana-submit.png` — hàng đợi tăng rồi giảm khi chạy kịch bản nộp bài.
- `grafana-ratelimit.png` — chấp nhận so với từ chối theo tầng.
- (tùy chọn) sơ đồ luồng đo (vẽ như các sơ đồ khác trong luận văn).

Mọi hình có chú thích tiếng Việt, đánh số theo chương (vd "Hình 5.x"), và phải được tham
chiếu trong văn trước khi xuất hiện.
