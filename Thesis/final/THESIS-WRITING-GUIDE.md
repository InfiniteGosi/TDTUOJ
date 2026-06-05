# Quy tắc viết luận văn (Vietnamese Thesis Writing Guide — TDTUOJ)

Quy tắc viết nội dung luận văn tiếng Việt cho đồ án TDTUOJ. **Mọi session phải tuân theo
khi soạn/sửa nội dung chương, mô tả hình, chú thích, tóm tắt.**

---

## 1. Ngôn ngữ & văn phong
- **Tiếng Việt học thuật, trang trọng.** Không dùng văn nói, không từ lóng, không cảm thán.
- **Khách quan, ngôi thứ ba.** KHÔNG dùng "tôi", "em", "mình". Dùng: *"nhóm tác giả"*,
  *"đề tài"*, *"hệ thống"*, hoặc câu bị động (*"được xây dựng"*, *"được triển khai"*).
- **Câu rõ ràng, vừa phải.** Tránh câu quá dài lồng nhiều mệnh đề. Một ý chính một câu.
- **Nhất quán thì/cách diễn đạt** trong cùng một phần.
- Không viết tắt kiểu chat (vd "ko", "dc"). Viết đầy đủ.

## 2. KHÔNG lạm dụng từ tiếng Anh kỹ thuật (quy tắc cốt lõi)
- **Ưu tiên thuật ngữ tiếng Việt đã được chấp nhận.** Chỉ giữ tiếng Anh khi:
  (a) chưa có từ Việt phổ biến, hoặc (b) là tên riêng/công nghệ/định danh.
- **Lần đầu xuất hiện:** ghi tiếng Việt rồi mở ngoặc tiếng Anh.
  Ví dụ: *"giao diện lập trình ứng dụng (API)"*, *"ca sử dụng (use case)"*. Các lần sau
  dùng nhất quán một dạng (thường là tiếng Việt, hoặc viết tắt đã định nghĩa).
- **KHÔNG chèn tiếng Anh khi đã có từ Việt rõ ràng.** Vd viết "luồng xử lý" thay vì "flow",
  "kiểm thử" thay vì "test", "triển khai" thay vì "deploy" trong câu văn.
- **KHÔNG trộn nửa Anh nửa Việt** kiểu *"submit bài"*, *"build hệ thống"*, *"deploy lên server"*.
  Viết: *"nộp bài"*, *"biên dịch hệ thống"*, *"triển khai lên máy chủ"*.
- **Giữ nguyên (không dịch):** tên công nghệ/sản phẩm (Spring Boot, React, PostgreSQL, Redis,
  Judge0, Docker, JWT), tên lớp/hàm/biến trong mã nguồn, từ khóa lập trình, định danh API.
  Để các định danh mã nguồn ở dạng `mã đơn dòng` (monospace).

### Bảng thuật ngữ tham chiếu (Anh → Việt)
| Tiếng Anh | Dùng trong luận văn |
|---|---|
| use case | ca sử dụng |
| actor | tác nhân |
| activity diagram | sơ đồ hoạt động |
| sequence diagram | sơ đồ tuần tự |
| class diagram | sơ đồ lớp |
| flow / workflow | luồng xử lý / quy trình |
| submit (solution) | nộp (bài làm / lời giải) |
| test case | trường hợp kiểm thử / ca kiểm thử |
| testing | kiểm thử |
| deploy | triển khai |
| build | biên dịch / dựng |
| feature | tính năng / chức năng |
| performance | hiệu năng |
| database | cơ sở dữ liệu |
| backend / frontend | phía máy chủ / phía giao diện (giữ Anh trong ngoặc lần đầu) |
| framework | nền tảng / khung phần mềm (framework) |
| request / response | yêu cầu / phản hồi |
| user | người dùng |
| verdict | kết quả chấm |
| judge / judging | chấm bài / hệ thống chấm |
| contest | kỳ thi / cuộc thi |
| problem | bài toán / đề bài |
| leaderboard | bảng xếp hạng |
| visualizer | trình minh họa |
| hint | gợi ý |

> **Giữ nguyên tiếng Anh (KHÔNG dịch):** API, JWT, HTTP, REST, SQL, UML, AI, LLM, ID,
> tên riêng công nghệ, định danh mã nguồn.

## 3. Thuật ngữ phải nhất quán toàn luận văn
- Chọn **một** cách gọi cho mỗi khái niệm và dùng xuyên suốt (vd luôn "ca sử dụng",
  không lúc "use case" lúc "trường hợp sử dụng").
- Lập **bảng thuật ngữ / danh mục viết tắt** ở đầu luận văn; mọi từ viết tắt phải định
  nghĩa ở lần đầu: *"... hệ thống chấm bài trực tuyến (Online Judge — OJ) ..."*.

## 4. Hình, bảng, sơ đồ
- Mọi hình có chú thích **tiếng Việt**, đánh số theo chương: *"Hình 3.7. Sơ đồ tuần tự
  ca sử dụng Nộp bài"*. Bảng: *"Bảng 2.1. ..."*.
- Chú thích đặt **dưới hình**, **trên bảng**.
- **Phải tham chiếu hình/bảng trong văn** trước khi nó xuất hiện (*"như Hình 3.7 mô tả..."*).
- Nhãn bên trong sơ đồ (UML) có thể giữ định danh kỹ thuật (`SubmissionController`) vì là
  tên lớp/mã nguồn — KHÔNG dịch.

## 5. Cấu trúc & trình bày
- Tiêu đề chương/mục viết hoa chữ đầu, không chấm cuối.
- Đoạn văn có câu chủ đề; tránh gạch đầu dòng tràn lan trong phần phân tích (dùng văn xuôi).
- Số liệu, đơn vị thống nhất (vd "ms", "MB"); dùng dấu phẩy/thập phân theo chuẩn đã chọn,
  nhất quán toàn bài.
- Trích dẫn nguồn theo chuẩn được khoa quy định (IEEE/APA...), đánh số/ghi tên-năm nhất quán.

## 6. Ngoại lệ ngôi xưng (LỜI CẢM ƠN / LỜI CAM ĐOAN)
- Mục **LỜI CẢM ƠN** dùng ngôi **"em"**, mục **LỜI CAM ĐOAN** dùng ngôi **"tôi"** — đây là
  văn mẫu bắt buộc theo quy định TĐT, **KHÔNG đổi sang ngôi thứ ba**.
- Quy tắc ngôi thứ ba (mục 1) chỉ áp dụng cho **phần thân phân tích/kỹ thuật** (các chương nội dung).

## 7. Quy tắc trình bày file `thesis.tex` (LaTeX)
- **Không để cả đoạn văn trên một dòng vật lý.** Ngắt dòng mềm ở **≤ 90 cột** để người khác
  đọc/diff được. Trong LaTeX **một dấu xuống dòng = một dấu cách**, nên ngắt giữa đoạn an toàn;
  **dòng trống mới tạo đoạn mới** — không thêm dòng trống khi chỉ wrap.
- Khi reflow phải **an toàn token**: chỉ ngắt ở **dấu cách**, KHÔNG tách giữa lệnh như
  `\ac{LLM}`; **KHÔNG wrap dòng comment** (`%` — phần đuôi sẽ thành mã chạy); giữ nguyên `\\`, `&`.
- Cách reflow nhanh + kiểm chứng (đã dùng):
  1. Script Python wrap theo cột, bỏ qua dòng có `%` và dòng ngắn, giữ thụt lề.
  2. **Kiểm chứng nội dung không đổi:** so sánh hai bản sau khi gộp mọi khoảng trắng
     (`re.sub(r'\s+',' ',s)`) — phải **IDENTICAL** (chỉ đổi cách xuống dòng).
  3. **Biên dịch kiểm tra:** `pdflatex -interaction=nonstopmode -halt-on-error -draftmode thesis.tex`
     phải EXIT 0 (doc dùng `utf8` + `[T5]fontenc` + `babel vietnamese` → engine **pdflatex**).
  4. Dọn file phụ (`.aux .log .toc .out .lof .lot .bcf .bbl`...) sau khi kiểm.

## 8. Bảng quy đổi thuật ngữ ĐÃ ÁP DỤNG trong thesis.tex (dùng nhất quán)
| Tiếng Anh | Lần đầu ghi | Sau đó |
|---|---|---|
| backend | phía máy chủ (backend) | phía máy chủ / backend |
| frontend | phía giao diện người dùng (frontend) | phía giao diện / frontend |
| framework | nền tảng phát triển ứng dụng (framework) | framework |
| component | thành phần (component) | component |
| connection pool | bể kết nối (connection pool) | — |
| overhead | chi phí phụ trội (overhead) | — |
| worker | tiến trình xử lý (worker) | worker |
| contest (chung) | cuộc thi | cuộc thi |
| code (chung) | mã nguồn | mã nguồn |

> Giữ NGUYÊN tiếng Anh (không dịch): Spring Boot, React, Docker, Judge0, Redis, PostgreSQL,
> AWS S3, Trello/Kanban/Agile/Scrum, và mọi từ trong danh mục viết tắt (API, JWT, HTTP, REST,
> JSON, LLM, AI, PDF, MVC, JPA...). Mẫu `VN (English)` ở lần đầu là cách an toàn nhất.

## 9. Checklist trước khi chốt một phần
- [ ] Không còn ngôi "tôi/em/mình".
- [ ] Không trộn Anh–Việt; từ Anh đều có lý do (tên riêng / chưa có từ Việt).
- [ ] Thuật ngữ nhất quán với bảng thuật ngữ.
- [ ] Mọi viết tắt đã định nghĩa ở lần đầu.
- [ ] Hình/bảng có số + chú thích tiếng Việt + được tham chiếu trong văn.
- [ ] Văn phong trang trọng, khách quan, không văn nói.

---

*Tham chiếu liên quan: `figures/ACTIVITY-DIAGRAM-GUIDE.md` (quy tắc vẽ sơ đồ).*