# Luồng Chấm Bài (Judging Flow) trong TDTUOJ

> Tài liệu này mô tả toàn bộ vòng đời của một lần nộp bài — từ khi người dùng nhấn **Submit**
> đến khi kết quả chấm điểm được hiển thị trên giao diện — với trọng tâm vào cơ chế
> **polling (thăm dò trạng thái)** phía frontend và **hàng đợi bất đồng bộ** phía backend.

---

## 1. Tổng quan kiến trúc

TDTUOJ sử dụng mô hình **asynchronous judging** (chấm bài bất đồng bộ).
HTTP request của người dùng trả về **ngay lập tức** với trạng thái `PENDING`,
trong khi công việc nặng nề (biên dịch, thực thi, đối chiếu kết quả) được thực hiện
ở một luồng nền riêng biệt, giao tiếp với **Judge0** — một sandboxed code execution engine.

```
Browser ──POST──► Spring API ──► PostgreSQL (PENDING)
                      │
                      └──► Redis Queue (RPUSH)
                                │
                          [async boundary]
                                │
                     SubmissionWorker (BLPOP, 100ms delay)
                                │
                     SubmissionJudgeService
                          │         │
                        AWS S3    Judge0
                          │         │
                     PostgreSQL (COMPLETED + verdict)
```

---

## 2. Luồng chi tiết (Phía Backend)

### Bước 1 — Tiếp nhận bài nộp (`POST /api/submissions`)

**Class:** `SubmissionController` → `SubmissionServiceImpl.createSubmission()`

Trước khi lưu bài, service thực hiện ba lớp kiểm tra đầu vào theo thứ tự từ rẻ nhất đến đắt nhất:

| Kiểm tra | Điều kiện chặn | HTTP trả về |
|---|---|---|
| Rate limit (cooldown) | User đã nộp trong 5 giây vừa qua | `429 Too Many Requests` |
| Contest registration | User không đăng ký hoặc chưa được duyệt | `403 Forbidden` |
| Lab deadline | Đã quá hạn nộp bài của Lab | `403 Forbidden` |

Nếu vượt qua tất cả, bài nộp được lưu vào PostgreSQL với `submissionStatus = PENDING`.

### Bước 2 — Đẩy vào hàng đợi Redis

**Class:** `SubmissionQueueService.enqueue()`

```java
// RPUSH: đẩy job vào cuối danh sách
Long queueSize = redisTemplate.opsForList().rightPush("submissions:queue", job);

// Lưu vị trí hàng chờ để frontend hiển thị
redisTemplate.opsForValue().set(
    "submissions:position:" + job.getSubmissionId(),
    queueSize,          // vị trí 1-based
    1, TimeUnit.HOURS   // TTL
);

// Bật cooldown cho user (5 giây)
redisTemplate.opsForValue().set("submissions:cooldown:" + userId, "1", 5, TimeUnit.SECONDS);
```

### Bước 3 — Phản hồi ngay lập tức

API trả về `202 Accepted` với payload chứa `submissionId` và `queuePosition`.
Client không đợi kết quả — đây là **ranh giới bất đồng bộ**.

```json
{
  "statusCode": 202,
  "message": "Submission received, judging in progress",
  "data": {
    "id": 1042,
    "submissionStatus": "PENDING",
    "queuePosition": 3
  }
}
```

### Bước 4 — Worker kéo bài từ hàng đợi

**Class:** `SubmissionWorker.poll()` — chạy theo lịch `@Scheduled(fixedDelay = 100ms)`

```java
@Scheduled(fixedDelay = 100)
public void poll() {
    // BLPOP: block tối đa 5 giây chờ job mới xuất hiện
    SubmissionJobDTO job = submissionQueueService.dequeue();
    if (job == null) return;   // hàng đợi rỗng — thử lại sau 100ms

    submissionJudgeService.judge(job);
}
```

**Tại sao dùng `BLPOP` thay vì `LPOP` đơn giản?**
`BLPOP` là **blocking pop** — Redis tự block kết nối tối đa 5 giây cho đến khi có phần tử.
Điều này giúp worker **không busy-spin** (vòng lặp liên tục gọi Redis khi queue rỗng),
tiết kiệm CPU và giảm số lần round-trip tới Redis.

> **Lưu ý về single-threaded design:** `fixedDelay` (không phải `fixedRate`) đảm bảo
> lần lặp tiếp theo chỉ bắt đầu **sau khi lần lặp hiện tại kết thúc hoàn toàn**.
> Worker xử lý tuần tự, một bài tại một thời điểm, tránh race condition với Judge0.

### Bước 5 — Thực thi trên Judge0

**Class:** `SubmissionJudgeService.judge()`

1. Đặt `submissionStatus = RUNNING`, xóa position key khỏi Redis (`clearPosition()`).
2. Lấy danh sách test case từ PostgreSQL.
3. Với **mỗi test case**: đọc `input` và `expected_output` từ AWS S3, gọi:
   ```
   POST https://judge0-host/submissions?wait=true&base64_encoded=true
   ```
   Judge0 trả về verdict (AC / WA / TLE / MLE / RE / CE), thời gian và bộ nhớ.
4. **ICPC mode:** dừng sớm tại test case thất bại đầu tiên (first-failure wins).
   **IOI mode:** chạy hết tất cả test case để tính điểm tỷ lệ.
5. Lưu kết quả cuối vào PostgreSQL: `submissionStatus = COMPLETED`, `submissionVerdict = AC/WA/...`

### Bước 6 — Cập nhật thống kê và bảng xếp hạng

| Hành động | Điều kiện |
|---|---|
| Ghi nhật ký hoạt động ngày (`UserActivityService`) | Mọi lần nộp |
| Cộng điểm và đánh dấu "đã giải" (`UserStatisticsService`) | AC đầu tiên cho bài đó |
| Cập nhật Redis leaderboard (ICPC) | AC trong contest đang diễn ra |
| Cập nhật Redis leaderboard (IOI) | Mọi lần nộp trong contest, giữ điểm cao nhất |

---

## 3. Cơ chế Polling (Phía Frontend)

### Nguyên lý

Sau khi nhận `202 Accepted`, frontend **không dùng WebSocket hay Server-Sent Events**.
Thay vào đó, nó sử dụng **HTTP polling** — gọi định kỳ endpoint:

```
GET /api/submissions/{id}/status
```

cho đến khi nhận được `submissionStatus = "COMPLETED"`.

### Vòng đời polling (ProblemDetailsPage.jsx, LabProblemPage.jsx, ContestProblemPage.jsx)

```
[User clicks Submit]
        │
        ▼
POST /api/submissions  ──► 202 { id, status: PENDING, queuePosition: N }
        │
        ▼
setQueuePosition(N)             ← hiển thị "Position #N" trên UI
        │
        ▼
setInterval(pollFn, 2000ms)     ← bắt đầu polling mỗi 2 giây
        │
        ├── status == "PENDING"   → setQueuePosition(updated.queuePosition)
        │                            (vị trí có thể giảm theo thời gian)
        │
        ├── status == "RUNNING"   → setQueuePosition(null)
        │                            ("Judging..." — không còn trong queue)
        │
        └── status == "COMPLETED" → clearInterval()
                                     hiển thị verdict, thời gian, bộ nhớ
```

### Code frontend (trích từ ProblemDetailsPage.jsx)

```javascript
// Sau khi submit thành công:
setQueuePosition(sub.queuePosition ?? null);

const intervalId = setInterval(async () => {
  const statusResp = await ApiService.getSubmissionStatus(sub.id);
  const updated = statusResp.data;

  if (updated.submissionStatus === "PENDING") {
    setQueuePosition(updated.queuePosition ?? null);  // cập nhật vị trí
  } else if (updated.submissionStatus === "RUNNING") {
    setQueuePosition(null);  // đang chấm, không còn trong hàng chờ
  } else if (updated.submissionStatus === "COMPLETED") {
    clearInterval(intervalId);
    setPollingId(null);
    setQueuePosition(null);
    setResults(updated);     // hiển thị kết quả
  }
}, 2000);

setPollingId(intervalId);
```

### Cleanup

React cleanup function đảm bảo interval bị hủy khi component unmount (user rời trang):

```javascript
useEffect(() => {
  return () => { if (pollingId) clearInterval(pollingId); };
}, [pollingId]);
```

### API Service Layer

```javascript
// ApiService.js
static async getSubmissionStatus(submissionId) {
  return axios.get(`${this.BASE_URL}/submissions/${submissionId}/status`, ...);
}
```

---

## 4. Redis Keys tham chiếu

| Key pattern | Kiểu | TTL | Mục đích |
|---|---|---|---|
| `submissions:queue` | List (FIFO) | — | Hàng đợi chấm bài chính |
| `submissions:position:<id>` | String | 1 giờ | Vị trí hàng chờ cho client polling |
| `submissions:cooldown:<userId>` | String | 5 giây | Anti-spam, chặn nộp liên tục |

Redis được chọn thay vì in-memory queue vì: tồn tại qua restart, có thể chia sẻ
giữa nhiều instance backend (horizontal scaling).

---

## 5. Endpoint Backend cho Polling

**Class:** `SubmissionController.getSubmissionStatus()` → `SubmissionServiceImpl.getSubmissionStatus()`

```
GET /api/submissions/{id}/status
```

Logic bổ sung:
- **Contest fairness:** Trong thời gian contest đang diễn ra (locked), chỉ chủ sở hữu bài nộp,
  ADMIN, hoặc creator của contest mới xem được. Người khác nhận `404` (không phải `403`)
  để không lộ thông tin sự tồn tại của bài nộp.
- **Queue position:** Chỉ trả về `queuePosition` khi `submissionStatus == PENDING`.
  Khi bài đã được worker pick up (RUNNING/COMPLETED), position key đã bị xóa.

---

## 6. Sequence Diagram

```
Browser          API Server        Redis           Worker          Judge0         PostgreSQL
   │                  │               │               │               │                │
   │──POST /submit───►│               │               │               │                │
   │                  │──RPUSH───────►│               │               │                │
   │                  │──SET position►│               │               │                │
   │                  │──SET cooldown►│               │               │                │
   │◄──202 PENDING────│               │               │               │                │
   │                  │               │               │               │                │
   │──GET /status────►│──────────────────────────────────────────────────────────────►│
   │◄──PENDING pos=3──│               │               │               │                │
   │                  │               │               │               │                │
   │    (2s later)    │               │◄──BLPOP───────│               │                │
   │                  │               │──job──────────►               │                │
   │                  │               │──DEL position►│               │                │
   │                  │               │               │──S3 fetch─────────────────────►│
   │                  │               │               │◄──input/output                 │
   │                  │               │               │──POST judge──►│                │
   │                  │               │               │◄──result──────│                │
   │                  │               │               │──save COMPLETED───────────────►│
   │                  │               │               │               │                │
   │──GET /status────►│──────────────────────────────────────────────────────────────►│
   │◄──COMPLETED AC───│               │               │               │                │
```

---

## 7. Tại sao dùng Polling thay vì WebSocket?

| Tiêu chí | HTTP Polling (TDTUOJ) | WebSocket |
|---|---|---|
| Độ phức tạp backend | Thấp — RESTful endpoint đơn giản | Cao — cần quản lý session WS |
| Stateless | ✅ Hoàn toàn stateless | ❌ Stateful connection |
| Scale ngang | ✅ Không cần sticky session | ❌ Cần sticky session hoặc pub/sub |
| Firewall/proxy | ✅ Hoạt động qua mọi HTTP proxy | ⚠️ Một số proxy chặn WS |
| Độ trễ cập nhật | ~2 giây | Gần thực (< 100ms) |
| Phù hợp với use case | ✅ Judging mất 5–30s — 2s polling là đủ | Overkill với latency requirement này |

Với thời gian chấm bài trung bình từ vài giây đến vài chục giây,
độ trễ 2 giây của polling là hoàn toàn chấp nhận được và đổi lại
được một kiến trúc đơn giản, dễ maintain hơn nhiều.
