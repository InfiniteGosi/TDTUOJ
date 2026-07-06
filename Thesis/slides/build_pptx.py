# -*- coding: utf-8 -*-
"""
Sinh slide bảo vệ khóa luận TDTUOJ -> defense-slides.pptx
Nền trắng, chữ đen, không màu/biểu tượng. Tiếng Việt. 16:9.
Nội dung: cơ sở lý thuyết của hệ thống, trình bày trong ~10 phút.
Mỗi slide có ghi chú thuyết trình (speaker notes) kèm thời lượng gợi ý.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

BLACK = RGBColor(0x00, 0x00, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREY  = RGBColor(0x55, 0x55, 0x55)
FONT  = "Times New Roman"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def add_slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = WHITE
    return s


def textbox(slide, left, top, width, height):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    return tf


def set_run(run, text, size, bold=False, italic=False, color=BLACK):
    run.text = text
    f = run.font
    f.name = FONT
    f.size = Pt(size)
    f.bold = bold
    f.italic = italic
    f.color.rgb = color


def add_notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def title_slide(title, subtitle, author, institute, date, notes=None):
    s = add_slide()
    tf = textbox(s, Inches(1), Inches(2.2), Inches(11.33), Inches(1.6))
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    set_run(p.add_run(), title, 30, bold=True)
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER; p2.space_before = Pt(8)
    set_run(p2.add_run(), subtitle, 18, italic=True, color=GREY)

    tf2 = textbox(s, Inches(1), Inches(4.4), Inches(11.33), Inches(2))
    for i, line in enumerate([author, institute, date]):
        p = tf2.paragraphs[0] if i == 0 else tf2.add_paragraph()
        p.alignment = PP_ALIGN.CENTER; p.space_after = Pt(4)
        set_run(p.add_run(), line, 14, color=BLACK if i == 0 else GREY)

    ln = s.shapes.add_shape(1, Inches(4.16), Inches(4.15), Inches(5), Pt(1.5))
    ln.fill.solid(); ln.fill.fore_color.rgb = BLACK; ln.line.fill.background()
    if notes:
        add_notes(s, notes)
    return s


def content_slide(title, blocks, notes=None):
    """blocks: list of items. Each item:
       ('h', text)      -> dòng đậm (heading nhỏ)
       ('b', text)      -> gạch đầu dòng cấp 1
       ('s', text)      -> gạch đầu dòng cấp 2
       ('n', text)      -> đoạn thường
       ('c', text)      -> dòng canh giữa đậm
       ('num', text)    -> danh sách đánh số
       ('f', text)      -> công thức, canh giữa, nghiêng
    """
    s = add_slide()
    tf = textbox(s, Inches(0.7), Inches(0.35), Inches(11.9), Inches(0.9))
    p = tf.paragraphs[0]
    set_run(p.add_run(), title, 24, bold=True)
    ln = s.shapes.add_shape(1, Inches(0.7), Inches(1.25), Inches(11.9), Pt(1.5))
    ln.fill.solid(); ln.fill.fore_color.rgb = BLACK; ln.line.fill.background()

    body = textbox(s, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.6))
    num_i = 0
    for i, (kind, text) in enumerate(blocks):
        p = body.paragraphs[0] if i == 0 else body.add_paragraph()
        if kind == 'h':
            p.space_before = Pt(10); p.space_after = Pt(3)
            set_run(p.add_run(), text, 17, bold=True)
        elif kind == 'b':
            p.level = 1; p.space_after = Pt(3)
            set_run(p.add_run(), "– " + text, 16)
        elif kind == 's':
            p.level = 2; p.space_after = Pt(2)
            set_run(p.add_run(), "· " + text, 15, color=GREY)
        elif kind == 'n':
            p.space_after = Pt(4)
            set_run(p.add_run(), text, 16)
        elif kind == 'c':
            p.alignment = PP_ALIGN.CENTER; p.space_before = Pt(16)
            set_run(p.add_run(), text, 18, bold=True)
        elif kind == 'num':
            num_i += 1; p.space_after = Pt(5)
            set_run(p.add_run(), f"{num_i}. {text}", 16)
        elif kind == 'f':
            p.alignment = PP_ALIGN.CENTER
            p.space_before = Pt(4); p.space_after = Pt(4)
            set_run(p.add_run(), text, 16, italic=True)
    if notes:
        add_notes(s, notes)
    return s


# ---------------- Slide 1: tiêu đề (0:30) ----------------
title_slide(
    "Hệ thống chấm bài trực tuyến cho lập trình thi đấu",
    "Cơ sở lý thuyết của hệ thống TDTUOJ",
    "Sinh viên thực hiện: Hồ Khang",
    "Khoa Công nghệ Thông tin – Trường Đại học Tôn Đức Thắng",
    "Bảo vệ khóa luận tốt nghiệp",
    notes="[0:30] Chào Hội đồng. Giới thiệu tên, đề tài. "
          "Phần trình bày tập trung vào các cơ sở lý thuyết đã vận dụng để xây dựng TDTUOJ.",
)

# ---------------- Slide 2: bối cảnh + nội dung (0:45) ----------------
content_slide("Bối cảnh và nội dung trình bày", [
    ('h', "Bối cảnh"),
    ('b', "Chấm bài thủ công tốn thời gian, khó nhất quán khi số sinh viên tăng."),
    ('b', "Các nền tảng hiện có (Codeforces, LeetCode, VNOJ) không phục vụ quản lý lớp học, phân quyền giảng viên/sinh viên và vận hành nội bộ."),
    ('h', "Nội dung trình bày"),
    ('num', "Bài toán chấm bài tự động và cơ chế phán quyết"),
    ('num', "Cô lập thực thi trong sandbox (Judge0)"),
    ('num', "Kiến trúc phân tầng, REST không trạng thái"),
    ('num', "Xử lý chấm bài bất đồng bộ (hàng đợi – worker)"),
    ('num', "Xác thực, phân quyền (JWT, RBAC) và giới hạn tần suất"),
    ('num', "Mô hình tính điểm cuộc thi và đánh giá năng lực"),
    ('num', "Trực quan hóa cấu trúc dữ liệu bằng chèn mã đo đạc"),
    ('num', "Tích hợp mô hình ngôn ngữ lớn (LLM)"),
], notes="[0:45] Nêu nhanh khoảng trống: các OJ công cộng không có quản lý tổ chức, "
         "phân quyền theo vai trò đào tạo, LLM hỗ trợ học tập. TDTUOJ lấp khoảng trống đó. "
         "Sau đó điểm qua 8 chủ đề lý thuyết.")

# ---------------- Slide 3: Online Judge (1:00) ----------------
content_slide("1. Bài toán chấm bài tự động", [
    ('n', "Định nghĩa. Online Judge nhận mã nguồn, biên dịch và thực thi trên bộ dữ liệu kiểm thử, so khớp kết quả với đáp án mẫu để kết luận."),
    ('h', "Nguyên lý chấm dựa trên ca kiểm thử (test-case based)"),
    ('b', "Mỗi bài toán gắn với tập ca kiểm thử (đầu vào → đầu ra kỳ vọng)."),
    ('b', "Lời giải đúng khi qua toàn bộ ca kiểm thử trong giới hạn thời gian và bộ nhớ."),
    ('b', "Hỗ trợ sáu ngôn ngữ: C, C++, C#, Java, JavaScript, Python."),
    ('h', "Các phán quyết (verdict)"),
    ('b', "AC (Accepted), WA (Wrong Answer), TLE (Time Limit Exceeded), MLE (Memory Limit Exceeded), RE/SF (Runtime Error), CE (Compile Error), IE (Internal Error)."),
], notes="[1:00] Nhấn mạnh: chấm khách quan, tự động, phản hồi tức thì. "
         "Verdict trả về kèm thời gian thực thi và bộ nhớ sử dụng thực tế.")

# ---------------- Slide 4: Sandbox (1:00) ----------------
content_slide("2. Cô lập thực thi trong sandbox", [
    ('n', "Vấn đề. Thực thi mã nguồn không tin cậy trên máy chủ ⇒ rủi ro bảo mật và tranh chấp tài nguyên."),
    ('h', "Cơ chế cô lập (isolation) ở mức nhân hệ điều hành"),
    ('b', "cgroups: giới hạn CPU, bộ nhớ, số tiến trình cho từng lần chấm."),
    ('b', "namespaces: tách biệt hệ thống tập tin, mạng, cây tiến trình."),
    ('b', "Mỗi bài nộp chạy trong hộp cát riêng, không ảnh hưởng lẫn nhau."),
    ('h', "Áp dụng: Judge0 tự triển khai (self-hosted) qua Docker"),
    ('b', "Container đặc quyền (privileged) để tạo sandbox isolate; đo chính xác thời gian và bộ nhớ."),
    ('b', "Yêu cầu quyền điều khiển cgroup ở mức nhân ⇒ triển khai trên máy ảo thay vì nền tảng PaaS đóng gói sẵn."),
], notes="[1:00] Điểm hay để nói với Hội đồng: đây là lý do kiến trúc triển khai dùng VM Azure "
         "chứ không dùng PaaS — Judge0 cần privileged container và cgroup. "
         "Tự triển khai nên hệ thống vận hành độc lập, không phụ thuộc API có phí.")

# ---------------- Slide 5: Kiến trúc (1:00) ----------------
content_slide("3. Kiến trúc phân tầng và REST không trạng thái", [
    ('h', "Mô hình client–server nhiều tầng"),
    ('b', "Tầng trình bày (React SPA) – Tầng nghiệp vụ (Spring Boot) – Tầng dữ liệu (PostgreSQL, Redis, S3)."),
    ('b', "Trong backend: Controller → Service → Repository, tách biệt trách nhiệm rõ ràng."),
    ('h', "Nguyên lý REST"),
    ('b', "Giao tiếp không trạng thái (stateless): mỗi request tự chứa đủ thông tin."),
    ('b', "Tài nguyên định danh qua URI; thao tác qua phương thức HTTP (GET/POST/PUT/DELETE); dữ liệu JSON."),
    ('b', "Không lưu phiên trên máy chủ ⇒ dễ mở rộng theo chiều ngang."),
    ('h', "Lợi ích"),
    ('b', "Frontend và backend phát triển, triển khai độc lập; bảo mật và rate limit cài dưới dạng filter, không xen vào mã nghiệp vụ."),
], notes="[1:00] Nếu Hội đồng hỏi vì sao chọn phân tầng: dễ kiểm thử từng lớp, "
         "dễ thay thế thành phần (ví dụ đổi LLM provider), filter chain áp dụng nhất quán cho mọi request.")

# ---------------- Slide 6: Bất đồng bộ (1:00) ----------------
content_slide("4. Xử lý chấm bài bất đồng bộ", [
    ('n', "Vấn đề. Chấm bài tốn thời gian (biên dịch + chạy nhiều ca kiểm thử) ⇒ không thể giữ kết nối HTTP chờ đồng bộ."),
    ('h', "Mô hình hàng đợi – worker (producer–consumer)"),
    ('b', "Bài nộp được lưu ngay với trạng thái PENDING và đẩy vào hàng đợi Redis; phản hồi người dùng tức thì."),
    ('b', "Worker nền lấy công việc khỏi hàng đợi, gửi sang Judge0, cập nhật JUDGING → COMPLETED; frontend nhận kết quả qua polling."),
    ('b', "Tách rời tốc độ tiếp nhận và tốc độ xử lý ⇒ chịu được đỉnh tải khi nhiều người nộp cùng lúc."),
    ('h', "Redis kiêm bộ nhớ đệm (cache)"),
    ('b', "Bảng xếp hạng cuộc thi tính sẵn trên Redis, chỉ làm mới khi có bài nộp làm đổi thứ hạng ⇒ giảm truy vấn PostgreSQL."),
], notes="[1:00] Nhấn mạnh hai vai trò của Redis: hàng đợi bài nộp và cache leaderboard. "
         "Đây là câu trả lời cho yêu cầu phi chức năng về hiệu năng ở Chương 3.")

# ---------------- Slide 7: Bảo mật (1:00) ----------------
content_slide("5. Xác thực, phân quyền và bảo mật", [
    ('h', "Xác thực phi trạng thái bằng JWT (JSON Web Token)"),
    ('b', "Token tự chứa (header.payload.signature), ký bằng HMAC-SHA256 để chống giả mạo."),
    ('b', "Gửi kèm header Authorization: Bearer; filter kiểm tra chữ ký và thời hạn, sai thì trả HTTP 401."),
    ('b', "Máy chủ không lưu phiên ⇒ chạy thêm nhiều máy chủ song song dễ dàng."),
    ('h', "Phân quyền theo vai trò (RBAC)"),
    ('b', "Ba vai trò: ADMIN, CREATOR (giảng viên), PARTICIPANT (sinh viên)."),
    ('b', "Kiểm soát ở mức phương thức bằng @PreAuthorize."),
    ('h', "Băm mật khẩu"),
    ('b', "BCrypt – hàm băm một chiều có salt và hệ số chi phí, chống dò bảng cầu vồng (rainbow table)."),
], notes="[1:00] Luồng: đăng nhập → cấp token → mỗi request qua AuthFilter kiểm tra chữ ký, "
         "nạp người dùng, thiết lập security context. Nếu bị hỏi refresh token: access token hạn ngắn, "
         "refresh token hạn dài hơn.")

# ---------------- Slide 8: Rate limiting (0:45) ----------------
content_slide("6. Giới hạn tần suất truy cập (rate limiting)", [
    ('n', "Mục tiêu. Bảo vệ tác vụ tốn tài nguyên (chấm bài, gọi LLM) trước lạm dụng, đảm bảo công bằng tài nguyên."),
    ('h', "Thuật toán token bucket (thư viện Bucket4j)"),
    ('b', "Mỗi người dùng một “gáo” token, nạp lại theo tốc độ cố định; mỗi request tiêu một token."),
    ('b', "Hết token ⇒ HTTP 429 kèm Retry-After; cho phép bùng nổ ngắn hạn nhưng khống chế tốc độ trung bình."),
    ('h', "Thiết kế trong hệ thống"),
    ('b', "Trạng thái bucket lưu tập trung trên Redis ⇒ hạn mức đồng nhất khi chạy nhiều máy chủ."),
    ('b', "Phân bậc (tier) theo loại thao tác: đăng nhập, nộp bài, LLM… — tách hạn mức ẩn danh / đã xác thực."),
    ('b', "Nguyên tắc fail-open: Redis gặp sự cố thì vẫn cho request đi qua, ưu tiên tính sẵn sàng."),
], notes="[0:45] Ví dụ tier: nộp bài 10 request/phút với người đã đăng nhập, "
         "LLM chặn hoàn toàn người ẩn danh. Có metrics (chấp nhận/từ chối/lỗi Redis) đưa vào Grafana giám sát.")

# ---------------- Slide 9: Tính điểm (1:15) ----------------
content_slide("7. Mô hình tính điểm và đánh giá năng lực", [
    ('h', "Hai thể thức chấm điểm cuộc thi"),
    ('b', "ICPC: xếp theo số bài giải đúng; hòa nhau thì xét tổng thời gian cộng phạt mỗi lần nộp sai."),
    ('b', "IOI: tính điểm từng phần theo số ca kiểm thử vượt qua."),
    ('h', "Đánh giá năng lực (rating) sau cuộc thi — biến thể của hệ Elo"),
    ('b', "Điểm khởi tạo 1500. Thứ hạng kỳ vọng (seed) của thí sinh xác định bởi số thí sinh có điểm cao hơn:"),
    ('f', "sᵢ = 1 + |{ j : Rⱼ > Rᵢ }|"),
    ('b', "Mức thay đổi điểm tỷ lệ với chênh lệch giữa kỳ vọng và thực tế (K = 100, N thí sinh):"),
    ('f', "Δᵢ = round( K · (sᵢ − rᵢ) / N ),   Rᵢ′ = max(1, Rᵢ + clip(Δᵢ, −150, 150))"),
    ('b', "Vượt kỳ vọng ⇒ tăng điểm; kém kỳ vọng ⇒ giảm; chặn biên ±150 để tránh biến động lớn."),
], notes="[1:15] Slide quan trọng — công thức khớp Chương 5 của khóa luận. "
         "Chạy bất đồng bộ khi mọi bài đã chấm xong; lưu RatingHistory (điểm trước/sau, delta, hạng); "
         "tính lại cuộc thi cũ thì phải tính lại cả chuỗi lịch sử phía sau để nhất quán.")

# ---------------- Slide 10: Trực quan hóa (1:15) ----------------
content_slide("8. Trực quan hóa cấu trúc dữ liệu", [
    ('n', "Ý tưởng. Ghi vết trạng thái chương trình qua từng bước thực thi để phát lại như hoạt ảnh (mảng, ngăn xếp, hàng đợi, danh sách liên kết, cây, đồ thị)."),
    ('h', "Kỹ thuật chèn mã đo đạc (code instrumentation)"),
    ('b', "Mỗi ngôn ngữ một bộ ghi vết (tracer): Python dùng cơ chế theo dõi của trình thông dịch; ngôn ngữ biên dịch được viết lại mã để chèn lời gọi ghi vết từng dòng."),
    ('b', "Khung trạng thái (frame) phát ra stderr: số bước, dòng lệnh, ngăn xếp lời gọi kèm biến cục bộ, vùng heap; định danh ổn định qua các khung ⇒ hoạt ảnh mượt."),
    ('b', "An toàn: giới hạn 5000 bước, cắt ngưỡng dữ liệu, thực thi trong sandbox Judge0."),
    ('h', "Suy luận kiểu hiển thị bằng LLM"),
    ('b', "Gemini phân loại vai trò ngữ nghĩa của biến (ma trận kề? bảng quy hoạch động?) — chạy song song, quá 3 giây thì frontend tự suy luận heuristic; kết quả cache Redis 24 giờ."),
], notes="[1:15] Đây là đóng góp khoa học chính của đề tài — hướng ít xuất hiện ở các OJ hiện hành. "
         "Nhấn: một endpoint duy nhất POST /api/visualize, hỗ trợ 6 ngôn ngữ, "
         "stdout của người dùng giữ nguyên, vết đi qua stderr có dấu hiệu nhận biết.")

# ---------------- Slide 11: LLM (0:45) ----------------
content_slide("9. Tích hợp mô hình ngôn ngữ lớn (LLM)", [
    ('h', "Mô hình proxy: backend làm trung gian với LLM (Gemini 2.5 Flash)"),
    ('b', "Kiểm soát nội dung request, giới hạn tần suất, ghi nhật ký; tự động gọi lại (retry) khi dịch vụ quá tải."),
    ('b', "Thiết kế đa nhà cung cấp: tra cứu theo tên, có thể mở rộng sang Claude, OpenAI."),
    ('h', "Cho sinh viên"),
    ('b', "Gợi ý học tập theo mức độ tăng dần — không tiết lộ lời giải; phân tích độ phức tạp thời gian/không gian của mã nguồn."),
    ('h', "Cho giảng viên"),
    ('b', "Trích xuất đề bài từ PDF (PDFBox + Gemini) thành các trường có cấu trúc; sinh 1–50 ca kiểm thử từ đề bài."),
    ('h', "Rào chắn (guardrail)"),
    ('b', "Chỉ thị hệ thống ràng buộc phạm vi: từ chối câu hỏi lạc đề; ngữ cảnh bài toán gắn vào từng prompt; chặn người ẩn danh ở bậc rate limit AI."),
], notes="[0:45] Nhấn triết lý: LLM là trợ giảng kích thích tư duy, không thay thế quá trình giải bài. "
         "Prompt có cấu trúc xây ở backend, ngữ cảnh đề bài + giới hạn + ví dụ được nhúng vào.")

# ---------------- Slide 12: Kết luận (0:30) ----------------
content_slide("Kết luận", [
    ('h', "Các cơ sở lý thuyết đã vận dụng trong TDTUOJ"),
    ('b', "Chấm tự động dựa trên ca kiểm thử; cô lập thực thi bằng cgroups/namespaces (Judge0 self-hosted)."),
    ('b', "Kiến trúc phân tầng, REST không trạng thái; hàng đợi – worker cho chấm bài bất đồng bộ."),
    ('b', "Bảo mật: JWT + RBAC + BCrypt; giới hạn tần suất bằng token bucket trên Redis."),
    ('b', "Chấm điểm ICPC/IOI; đánh giá năng lực theo biến thể Elo dựa trên thứ hạng kỳ vọng."),
    ('b', "Trực quan hóa bằng chèn mã đo đạc kết hợp LLM suy luận kiểu hiển thị."),
    ('b', "LLM hỗ trợ học tập có rào chắn — gợi ý, phân tích độ phức tạp, nhập đề từ PDF."),
    ('c', "Xin cảm ơn – Kính mời Hội đồng đặt câu hỏi."),
], notes="[0:30] Chốt: hệ thống đã triển khai thực tế trên Azure (api.tdtuoj.me), "
         "có CI/CD, kiểm thử tải k6 và giám sát Prometheus/Grafana — sẵn sàng demo nếu Hội đồng yêu cầu.")

out = "defense-slides.pptx"
prs.save(out)
print("Saved", out, "-", len(prs.slides._sldIdLst), "slides")
