# TDTUOJ — Kịch bản video demo (~12 phút)

> Bản nháp cấp cao — chỉ nêu **cảnh cần quay** + **ý cần nói**. Chi tiết tự xử lý khi quay.
> Lời thoại tiếng Việt, giữ nguyên thuật ngữ tiếng Anh (Judge0, submission, verdict, contest, visualizer...).
> Trước khi quay: VM chạy (nếu demo live), có sẵn tài khoản ADMIN (`KhangHo`) + 1 tài khoản sinh viên, DB có vài problem/contest/org mẫu.

---

## Tổng thời lượng ~12:00

| # | Phân đoạn | Thời lượng | Từ → đến |
|---|---|---|---|
| 1 | Mở đầu + tổng quan | 0:45 | 0:00 – 0:45 |
| 2 | Đăng ký / đăng nhập | 0:45 | 0:45 – 1:30 |
| 3 | Duyệt & xem problem | 1:00 | 1:30 – 2:30 |
| 4 | Nộp bài + chấm Judge0 | 1:30 | 2:30 – 4:00 |
| 5 | Visualizer | 1:45 | 4:00 – 5:45 |
| 6 | Tính năng AI | 2:00 | 5:45 – 7:45 |
| 7 | Contest + leaderboard | 1:15 | 7:45 – 9:00 |
| 8 | Organization + Lab | 1:15 | 9:00 – 10:15 |
| 9 | Admin panel | 0:45 | 10:15 – 11:00 |
| 10 | Monitoring / load test | 1:00 | 11:00 – 12:00 |

---

## 1 · Mở đầu + tổng quan (0:45)
- **Quay:** trang chủ (`/home`), lướt nhanh navbar.
- **Nói:** TDTUOJ là hệ thống chấm bài trực tuyến cho lập trình thi đấu. Nêu 3 vai trò: ADMIN, CREATOR (giảng viên), PARTICIPANT (sinh viên). Điểm nổi bật sẽ demo: chấm tự động qua Judge0, visualizer cấu trúc dữ liệu, và các tính năng AI.

## 2 · Đăng ký / đăng nhập (0:45)
- **Quay:** trang `/register` → điền nhanh (hoặc nút Google sign-in), rồi `/login`.
- **Nói:** xác thực bằng JWT, hỗ trợ đăng nhập Google. Đăng nhập bằng tài khoản sinh viên để demo luồng người học.

## 3 · Duyệt & xem problem (1:00)
- **Quay:** `/problems` — lọc theo độ khó / tag, mở 1 problem (`/problems/:slug`). Kéo qua đề bài, ví dụ input/output, khung nộp code (Monaco editor), chọn ngôn ngữ.
- **Nói:** danh sách problem công khai, có tag + độ khó (EASY/MEDIUM/HARD). Đề render Markdown. Editor Monaco, hỗ trợ Python/Java/C/C++.

## 4 · Nộp bài + chấm Judge0 (1:30)
- **Quay:** viết/dán lời giải đúng → **Submit** → chờ verdict đổi PENDING → JUDGING → **AC**. Sau đó nộp 1 bài sai để show **WA/TLE**. Mở tab submissions xem lịch sử + thời gian/bộ nhớ.
- **Nói:** code đẩy vào hàng đợi Redis, chấm **bất đồng bộ** qua Judge0 để không nghẽn giao diện. Các verdict: AC, WA, TLE, MLE, RE, CE. Đây là chức năng lõi.

## 5 · Visualizer (1:45)
- **Quay:** dán code `Thesis/demo-graph-visualizer.cpp` (DFS trên đồ thị) → **Visualize** → tua từng bước: đỉnh `g` là GRAPH, `stack_` là STACK, `visited`/`order` là ARRAY. Cho thấy đỉnh current sáng, cạnh active, stack push/pop.
- **Chốt ý:** trong mã nguồn KHÔNG có class đồ thị — chỉ `vector<vector<int>>`. Hệ thống trace lúc chạy rồi **suy ra hình dạng**.
- **Nói:** điểm khác biệt của đề tài. Backend **instrument** code người dùng, chạy qua Judge0, parse trace thành các bước. Frontend chọn renderer theo kiểu dữ liệu. Giúp sinh viên hiểu thuật toán trực quan.

## 6 · Tính năng AI (2:00)
- **Quay (a) — Hint:** trong 1 problem mở HintPanel → hỏi gợi ý → AI trả gợi ý (không cho lời giải). Thử hỏi lạc đề → bị từ chối.
- **Quay (b) — PDF → problem:** vai CREATOR, upload PDF đề → AI trích xuất thành problem statement.
- **Quay (c) — Sinh test case:** từ đề, bấm generate test cases → AI tạo bộ test.
- **Nói:** ba tính năng AI dùng Gemini. Hint được **guard** — chỉ hỗ trợ đúng bài, chặn câu hỏi ngoài phạm vi. PDF extraction + test-gen giúp giảng viên tạo đề nhanh.

## 7 · Contest + leaderboard (1:15)
- **Quay:** `/contests` → mở 1 contest đang RUNNING → đăng ký → vào 1 bài (`/contests/:c/problems/:p`) → nộp → mở **leaderboard** cập nhật.
- **Nói:** contest theo kiểu ICPC/IOI, trạng thái UPCOMING/RUNNING/ENDED, loại tham gia PUBLIC/PRIVATE/ORGANIZATION. Bảng xếp hạng tính điểm theo style.

## 8 · Organization + Lab (1:15)
- **Quay:** `/organizations` → mở 1 org → tab thành viên (OWNER/ADMIN/MEMBER) → mở 1 **Lab** → xem trang tiến độ (lab progress) sinh viên.
- **Nói:** mô hình lớp học — giảng viên tạo organization, giao **lab** (bài tập) cho thành viên, theo dõi tiến độ hoàn thành.

## 9 · Admin panel (0:45)
- **Quay:** đăng nhập ADMIN → `/admin` → lướt quản lý problem / contest / user / tag → mở **contest monitor**.
- **Nói:** khu vực quản trị cho ADMIN/CREATOR: CRUD problem, contest, quản lý người dùng, giám sát contest thời gian thực.

## 10 · Monitoring / load test (1:00)
- **Quay:** Grafana dashboard **TDTUOJ — Load & Health** đang chạy → mở terminal chạy `run-stress.ps1 -Scenario submit` → cho thấy **queue depth tăng rồi giảm**, req/s + p95 latency phản ứng.
- **Nói:** đo hiệu năng bằng k6 + Prometheus + Grafana. Kiến trúc bất đồng bộ hấp thụ đỉnh tải: hàng đợi phình lên rồi worker xử lý kịp → drain. (Chi tiết kịch bản: `monitoring/RUNBOOK.md`.)
- **Chốt:** nhắc lại hệ thống đã **deploy live** tại `https://tdtuoj.me` — cảm ơn.

---

### Mẹo quay
- Quay từng phân đoạn rời rồi ghép — dễ quay lại đoạn hỏng, canh đúng thời lượng.
- Chuẩn bị sẵn code mẫu (AC + 1 bài sai) để dán, không gõ live cho nhanh.
- Nếu demo live: kiểm VM đang chạy + Judge0 OK trước khi quay (xem `Thesis/PLAYBOOK.md`).
- Phóng to trình duyệt / font editor cho rõ khi lên video.
- Tổng 12:00 là trần — nếu tràn, cắt bớt §9 admin và phần sai-verdict ở §4.
</content>
