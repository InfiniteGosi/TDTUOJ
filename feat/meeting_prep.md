# Final Thesis Review — Meeting Preparation

> **Date:** July 26, 2026  
> **Format:** Online (~1 hour)  
> **Advisor:** ThS. Doãn Xuân Thanh  
> **Thesis:** Hệ thống Chấm bài Trực tuyến — TDTUOJ  
> **Student:** Hồ Nguyễn An Khang — 52200020  
> **Already sent:** Final thesis PDF + demo video

---

## Pre-Meeting Checklist (Do Tonight / Morning)

- [ ] **Start the Azure VM** — Portal → `vm-tdtuoj` → Start → wait for "Running"
- [ ] **Verify live site** — open `https://tdtuoj.me` and `https://api.tdtuoj.me`
- [ ] **Test a full submission** — login → pick a problem → submit Python/Java → confirm AC verdict
- [ ] **Test the visualizer** — run a simple algorithm (e.g. bubble sort) → confirm animation plays
- [ ] **Test AI hint** — open a problem → request hint → confirm response
- [ ] **Prepare screen sharing** — close unnecessary tabs/apps, clean desktop
- [ ] **Open these tabs in advance:**
  - `https://tdtuoj.me` (logged in as KhangHo / admin)
  - `https://api.tdtuoj.me/swagger-ui/` (authorized with Bearer token)
  - Thesis PDF on screen for quick reference
- [ ] **Backup plan** — have local dev ready (`localhost:5173` + `localhost:8090`) in case VM is slow
- [ ] **Stable internet** — test connection, have phone hotspot ready as fallback
- [ ] **Charge laptop**, close background apps, mute notifications

---

## Suggested Meeting Timeline (~60 minutes)

| Time | Duration | What |
|------|----------|------|
| 0:00 | 5 min | **Greetings & agenda** — ask if advisor has specific areas to discuss |
| 0:05 | 10 min | **Thesis walkthrough** — briefly present the structure and key contributions |
| 0:15 | 15 min | **Live demo** — walk through the system's core flows (see demo script below) |
| 0:30 | 15 min | **Advisor's questions & feedback** — answer questions, take notes on corrections |
| 0:45 | 5 min | **Your questions about defense** — see section below |
| 0:50 | 5 min | **Thesis corrections** — clarify any edits advisor wants before final submission |
| 0:55 | 5 min | **Next steps & closing** — confirm defense date, any remaining deliverables |

> [!TIP]
> Let the advisor lead. If they want to spend 30 minutes on questions, adjust the timeline. The demo can be shortened — the video was already sent.

---

## Live Demo Script (15 min, online-friendly)

Since this is online, prioritize **screen-sharing clarity** — zoom into UI elements, narrate every click.

### Flow 1: Core Judge Flow (5 min)
1. **Login** with Google OAuth → show role-based redirect
2. **Browse problems** → show tags, difficulty, search/filter
3. **Open a problem** → show the problem statement (rendered Markdown from S3)
4. **Submit a solution** (Python, correct) → watch status go from "Pending" → "Accepted"
5. **Submit a wrong solution** → show "Wrong Answer" with per-test-case results

### Flow 2: Differentiating Features (5 min)
6. **Data Structure Visualizer** — paste a bubble sort or BFS → hit Visualize → step through the animation frame by frame
   - *Narrate:* "The backend instruments the code, executes it in Judge0, captures an execution trace, then the LLM classifies variable roles, and D3.js renders the animation"
7. **AI Hint** — click "Get Hint" on a problem → show the controlled hint (no full solution revealed)
8. **AI PDF Parser** — (if time) upload a sample PDF → show auto-filled problem fields

### Flow 3: Management & Infrastructure (5 min)
9. **Contest** — show an existing contest with leaderboard, explain scoreboard freeze
10. **Organization & Lab** — show classroom management, student tracking
11. **Swagger UI** — quickly flash the API documentation (don't deep-dive)
12. **Mention** (don't need to show): CI/CD pipeline, Prometheus/Grafana monitoring, k6 load tests

> [!WARNING]
> **If something breaks during demo:**  
> Stay calm. Say "This is the live production environment — let me show the behavior on the local development setup" and switch to localhost. Or refer to the demo video already sent.

---

## Key Numbers to Cite

Keep these in your head — advisors love concrete data:

| Metric | Value |
|--------|-------|
| Unit tests | 101 (service layer) |
| Programming languages | 6 (C, C++, C#, Java, JavaScript, Python) |
| k6 load test scenarios | 3 (browse, submit, rate-limit) |
| Docker containers (prod) | 8 |
| Azure VM cost (running) | ~$62/month |
| Azure VM cost (deallocated) | ~$5–9/month |
| User roles | 3 (User, Contest Creator, Admin) |
| LLM features | 3 (hint, complexity analysis, PDF extraction + test-case gen) |
| Data structures visualized | 6 (array, stack, queue, linked list, tree, graph) |
| Rate limit tiers | 7 (see `application.yml`) |
| Tech stack components | Spring Boot 3.5, React 19, PostgreSQL 16, Redis 7, Judge0 CE, Caddy 2 |

---

## Anticipated Questions & Prepared Answers

### Architecture & Design

**Q: Tại sao chọn Spring Boot thay vì Node.js hay Django?**  
A: Spring Boot phù hợp với yêu cầu bài toán: hệ sinh thái bảo mật mạnh (Spring Security + JWT), JPA cho ORM, và hiệu năng tốt cho xử lý đồng thời. Đồng thời đây là ngôn ngữ em thành thạo nhất và phù hợp với chương trình đào tạo của khoa.

**Q: Tại sao self-host Judge0 thay vì dùng API trả phí?**  
A: Self-host giúp hệ thống vận hành độc lập, không phụ thuộc dịch vụ bên ngoài, không bị giới hạn số lần gọi, và tiết kiệm chi phí vận hành — phù hợp với yêu cầu của nền tảng học thuật.

**Q: Redis vừa làm queue vừa làm cache — sao không tách ra?**  
A: Ở quy mô hiện tại, một instance Redis đáp ứng đủ. Khi mở rộng, có thể tách thành hai instance riêng biệt mà không cần thay đổi kiến trúc ứng dụng, vì code đã tách biệt theo concern (queue service vs cache service).

### Visualizer (đây là điểm mạnh nhất — chuẩn bị kỹ)

**Q: Trình minh họa hoạt động cụ thể như thế nào?**  
A: 4 bước:
1. Backend nhận mã nguồn → chèn lệnh ghi vết (instrumentation) vào từng dòng
2. Mã đã chèn được gửi đến Judge0 sandbox → thực thi → thu trace (JSON)
3. LLM phân loại ngữ nghĩa biến: biến nào là array, stack, pointer, counter…
4. Frontend dùng D3.js render từng frame, cho phép bước tới/lùi

**Q: LLM phân loại biến thế nào? Có chính xác không?**  
A: LLM nhận danh sách biến + tên biến + kiểu dữ liệu + ngữ cảnh mã nguồn → phân loại vai trò ngữ nghĩa. Độ chính xác phụ thuộc LLM, nhưng kết quả sai không gây crash — chỉ ảnh hưởng cách trực quan hóa, người dùng vẫn thấy trace thực thi đúng.

### Testing & Quality

**Q: 101 unit test có đủ không?**  
A: 101 test tập trung ở service layer — nơi chứa logic nghiệp vụ cốt lõi. Đây là lớp quan trọng nhất cần bảo vệ. Em nhận thức rõ hạn chế: controller layer và visualizer chưa có unit test, đã ghi nhận trong phần hạn chế của luận văn.

**Q: Load test chạy trên máy cá nhân — kết quả có đáng tin?**  
A: Kết quả cho thấy xu hướng và xác nhận hệ thống không crash dưới tải. Tuy nhiên, em đã ghi rõ trong phần hạn chế rằng số liệu chưa phản ánh năng lực thực tế trong môi trường phân tán. Đây là hướng phát triển: tách Judge0 ra VM riêng và đo lại.

### Security

**Q: Bảo mật hệ thống như thế nào?**  
A: Nhiều lớp: JWT stateless auth + refresh token, Spring Security phân quyền theo role, rate limiting (Bucket4j + Redis) theo 7 tầng, HTTPS end-to-end (Caddy auto-TLS), Judge0 sandbox cô lập mã người dùng, Spring Data JPA parameterized queries chống SQL injection.

### Deployment

**Q: Chi phí vận hành lâu dài?**  
A: Hầu hết miễn phí (Vercel, GitHub Actions, GitHub Student Pack). Chi phí chính là Azure VM ~$62/tháng khi chạy liên tục, nhưng deallocate khi không dùng giảm còn ~$5–9/tháng. Hoàn toàn khả thi cho ngân sách sinh viên/khoa.

### Limitations (thể hiện sự trưởng thành khi tự nhận hạn chế)

**Q: Hệ thống có hạn chế gì?**  
A: 4 hạn chế chính em đã ghi nhận:
1. Polling thay vì WebSocket — gây trễ nhỏ khi chờ kết quả chấm
2. Unit test chưa phủ controller và visualizer
3. Load test trên máy local, chưa phản ánh môi trường phân tán
4. LLM phụ thuộc chi phí + hạn mức API, chất lượng không tuyệt đối

---

## Questions to Ask the Supervisor

### About Thesis Corrections

1. **"Thầy có góp ý gì cần sửa trong luận văn trước khi nộp bản chính thức cho hội đồng không?"**  
   *(Critical — there's almost always corrections. Take detailed notes.)*

2. **"Có phần nào trong luận văn thầy thấy cần bổ sung thêm chi tiết hoặc làm rõ hơn không?"**  
   *(Shows you're open to feedback.)*

3. **"Thầy đánh giá phần trình minh họa cấu trúc dữ liệu (visualizer) đã trình bày đủ rõ chưa, hay cần mô tả kỹ thuật chi tiết hơn?"**  
   *(This is your strongest contribution — make sure it's presented well.)*

### About the Council Defense

4. **"Hội đồng bảo vệ dự kiến vào ngày nào, và gồm mấy thành viên ạ?"**  
   *(You need to know the date and how many people you're presenting to.)*

5. **"Thời gian trình bày trước hội đồng là bao lâu? Bao nhiêu phút trình bày và bao nhiêu phút hỏi đáp?"**  
   *(Typically 15-20 min presentation + 10-15 min Q&A, but confirm.)*

6. **"Thầy có biết hội đồng thường quan tâm đến khía cạnh nào nhất không — kỹ thuật, phương pháp nghiên cứu, hay ứng dụng thực tiễn?"**  
   *(Gold question — your advisor knows the council members and their preferences.)*

7. **"Có thầy/cô nào trong hội đồng chuyên về lĩnh vực cụ thể mà em nên chuẩn bị kỹ phần đó không?"**  
   *(Knowing the reviewers helps you anticipate their questions.)*

8. **"Bài bảo vệ nên trình bày bằng slide hay kết hợp slide + demo trực tiếp?"**  
   *(Some councils prefer slides only, some like live demos.)*

9. **"Thầy có lời khuyên gì cho em trước buổi bảo vệ — những lỗi phổ biến mà sinh viên hay mắc?"**  
   *(Your advisor has seen many defenses — their experience is invaluable.)*

### About Grading & Deliverables

10. **"Ngoài luận văn và video demo, em cần chuẩn bị thêm tài liệu gì cho hội đồng không? (poster, source code, tài liệu hướng dẫn...)"**  
    *(You already have a poster from earlier work — confirm if it's needed.)*

11. **"Luận văn bản in cần bao nhiêu bản, và có yêu cầu đóng bìa cứng không?"**  
    *(Logistical but important — don't miss a deadline because of printing.)*

12. **"Thầy đánh giá mức độ hoàn thành của đề tài so với mục tiêu ban đầu như thế nào?"**  
    *(Gives you a sense of where you stand before the defense.)*

---

## Online Meeting Tips

- **Camera on** — it shows engagement and professionalism
- **Share screen with system audio off** — avoid notification sounds
- **Have a notepad open** (physical or digital) — write down every correction/suggestion the advisor gives
- **If connection drops** — rejoin, briefly summarize where you left off, continue
- **Speak slowly and clearly** — online audio can be choppy
- **After the meeting** — send a follow-up message summarizing the corrections you noted and your action items

---

## After the Meeting — Action Items Template

- [ ] Corrections to thesis: *(fill in during meeting)*
  - [ ] ...
  - [ ] ...
- [ ] Additional documents to prepare: *(fill in)*
- [ ] Defense date confirmed: *(fill in)*
- [ ] Presentation format: *(slides / slides+demo / other)*
- [ ] Time limit: *(X min presentation + Y min Q&A)*
- [ ] Print thesis: *(X copies, binding type)*
- [ ] Deallocate Azure VM after meeting to save costs
