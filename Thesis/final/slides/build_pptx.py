# -*- coding: utf-8 -*-
"""
Sinh slide bảo vệ khóa luận TDTUOJ -> defense-slides.pptx
Nền trắng, chữ đen, không màu/biểu tượng. Tiếng Việt. 16:9.
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

SW, SH = prs.slide_width, prs.slide_height


def add_slide():
    s = prs.slides.add_slide(BLANK)
    # nền trắng tường minh
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


def title_slide(title, subtitle, author, institute, date):
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

    # đường kẻ ngang trên tiêu đề
    ln = s.shapes.add_shape(1, Inches(4.16), Inches(4.15), Inches(5), Pt(1.5))
    ln.fill.solid(); ln.fill.fore_color.rgb = BLACK; ln.line.fill.background()


def content_slide(title, blocks):
    """blocks: list of items. Each item:
       ('h', text)      -> dòng đậm (heading nhỏ)
       ('b', text)      -> gạch đầu dòng cấp 1
       ('s', text)      -> gạch đầu dòng cấp 2
       ('n', text)      -> đoạn thường
       ('c', text)      -> dòng canh giữa đậm
       ('num', text)    -> danh sách đánh số
    """
    s = add_slide()
    # tiêu đề
    tf = textbox(s, Inches(0.7), Inches(0.35), Inches(11.9), Inches(0.9))
    p = tf.paragraphs[0]
    set_run(p.add_run(), title, 24, bold=True)
    # đường kẻ dưới tiêu đề
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
    return s


# ---------------- Slide 1: tiêu đề ----------------
title_slide(
    "Hệ thống chấm bài trực tuyến cho lập trình thi đấu",
    "Cơ sở lý thuyết của hệ thống",
    "Sinh viên thực hiện: Hồ Khang",
    "Khoa Công nghệ Thông tin – Trường Đại học Tôn Đức Thắng",
    "Bảo vệ khóa luận tốt nghiệp",
)

# ---------------- Slide 2: nội dung ----------------
content_slide("Nội dung trình bày", [
    ('num', "Bài toán chấm bài tự động (Online Judge)"),
    ('num', "Cô lập và chấm bài trong môi trường sandbox"),
    ('num', "Kiến trúc phân tầng, giao tiếp REST không trạng thái"),
    ('num', "Xử lý chấm bài bất đồng bộ (hàng đợi & worker)"),
    ('num', "Xác thực, phân quyền và bảo mật (JWT, BCrypt)"),
    ('num', "Giới hạn tần suất truy cập (rate limiting)"),
    ('num', "Mô hình tính điểm cuộc thi và đánh giá năng lực"),
    ('num', "Trực quan hóa cấu trúc dữ liệu qua giả lập thực thi"),
    ('num', "Tích hợp mô hình ngôn ngữ lớn (LLM)"),
])

# ---------------- Slide 3: Online Judge ----------------
content_slide("1. Bài toán chấm bài tự động", [
    ('n', "Định nghĩa. Online Judge nhận mã nguồn của người dùng, biên dịch và thực thi trên bộ dữ liệu kiểm thử, rồi so khớp kết quả để kết luận."),
    ('h', "Nguyên lý chấm dựa trên ca kiểm thử (test-case based)"),
    ('b', "Mỗi bài toán gắn với tập ca kiểm thử (đầu vào → đầu ra kỳ vọng)."),
    ('b', "Lời giải đúng khi qua toàn bộ ca kiểm thử trong giới hạn tài nguyên."),
    ('b', "Ràng buộc: giới hạn thời gian (time limit) và bộ nhớ (memory limit)."),
    ('h', "Các phán quyết (verdict)"),
    ('b', "AC (Accepted), WA (Wrong Answer), TLE (Time Limit), MLE (Memory Limit), RE (Runtime Error), CE (Compile Error)."),
])

# ---------------- Slide 4: Sandbox ----------------
content_slide("2. Cô lập và chấm bài trong sandbox", [
    ('n', "Vấn đề. Thực thi mã nguồn không tin cậy trên máy chủ ⇒ rủi ro bảo mật và tranh chấp tài nguyên."),
    ('h', "Cơ chế cô lập (isolation)"),
    ('b', "cgroups: giới hạn CPU, bộ nhớ, số tiến trình của mỗi lần chấm."),
    ('b', "namespaces: tách biệt hệ thống tập tin, mạng, tiến trình."),
    ('b', "Mỗi bài nộp chạy trong hộp cát riêng, không ảnh hưởng lẫn nhau."),
    ('h', "Áp dụng"),
    ('b', "Judge0 – bộ máy thực thi tự chủ dựa trên isolate và container hóa, đo chính xác thời gian và bộ nhớ."),
])

# ---------------- Slide 5: Kiến trúc ----------------
content_slide("3. Kiến trúc phân tầng và REST không trạng thái", [
    ('h', "Mô hình client–server nhiều tầng"),
    ('b', "Tầng trình bày (React) – Tầng nghiệp vụ (Spring Boot) – Tầng dữ liệu (PostgreSQL)."),
    ('b', "Tách biệt trách nhiệm: Controller → Service → Repository."),
    ('h', "Nguyên lý REST"),
    ('b', "Giao tiếp không trạng thái (stateless): mỗi yêu cầu tự chứa đủ thông tin."),
    ('b', "Tài nguyên định danh qua URI; thao tác qua phương thức HTTP (GET/POST/PUT/DELETE)."),
    ('b', "Không lưu phiên trên máy chủ ⇒ dễ mở rộng theo chiều ngang."),
])

# ---------------- Slide 6: Bất đồng bộ ----------------
content_slide("4. Xử lý chấm bài bất đồng bộ", [
    ('n', "Vấn đề. Chấm bài tốn thời gian (biên dịch + chạy nhiều ca) ⇒ không thể giữ kết nối HTTP chờ đồng bộ."),
    ('h', "Mô hình hàng đợi – worker (producer–consumer)"),
    ('b', "Yêu cầu nộp bài được ghi nhận ngay với trạng thái PENDING, trả về tức thì."),
    ('b', "Worker nền lấy bài từ hàng đợi, gửi sang bộ máy chấm, cập nhật JUDGING → COMPLETED."),
    ('b', "Giảm tải đỉnh, tách rời tốc độ nhận và tốc độ xử lý."),
    ('h', "Áp dụng"),
    ('b', "Thực thi bất đồng bộ bằng thread pool; Redis làm bộ đệm và điều phối."),
])

# ---------------- Slide 7: Bảo mật ----------------
content_slide("5. Xác thực, phân quyền và bảo mật", [
    ('h', "Xác thực bằng JWT (JSON Web Token)"),
    ('b', "Token tự chứa (header.payload.signature), ký số để chống giả mạo."),
    ('b', "Stateless: máy chủ không lưu phiên, xác thực bằng kiểm tra chữ ký."),
    ('h', "Phân quyền theo vai trò (RBAC)"),
    ('b', "Ba vai trò: ADMIN, CREATOR (giảng viên), PARTICIPANT (sinh viên)."),
    ('b', "Kiểm soát truy cập ở mức phương thức."),
    ('h', "Băm mật khẩu"),
    ('b', "BCrypt – hàm băm một chiều có salt và hệ số chi phí, chống tấn công dò bảng (rainbow table)."),
])

# ---------------- Slide 8: Rate limiting ----------------
content_slide("6. Giới hạn tần suất truy cập", [
    ('n', "Mục tiêu. Bảo vệ hệ thống trước lạm dụng và tấn công dồn dập, đảm bảo công bằng tài nguyên."),
    ('h', "Thuật toán gáo token (token bucket)"),
    ('b', "Mỗi người dùng có một “gáo” chứa token, nạp lại theo tốc độ cố định."),
    ('b', "Mỗi yêu cầu tiêu tốn một token; hết token ⇒ từ chối (HTTP 429)."),
    ('b', "Cho phép bùng nổ ngắn hạn nhưng khống chế tốc độ trung bình."),
    ('h', "Áp dụng"),
    ('b', "Bộ đếm lưu trên Redis (nhanh, chia sẻ giữa nhiều máy chủ)."),
])

# ---------------- Slide 9: Tính điểm ----------------
content_slide("7. Mô hình tính điểm và đánh giá năng lực", [
    ('h', "Hai thể thức chấm điểm"),
    ('b', "ICPC: tính theo số bài giải đúng; xếp hạng phụ theo tổng thời gian cộng phạt cho mỗi lần nộp sai."),
    ('b', "IOI: tính điểm từng phần theo số ca kiểm thử vượt qua."),
    ('h', "Đánh giá năng lực sau cuộc thi"),
    ('b', "Dựa trên nguyên lý Elo: cập nhật điểm theo kỳ vọng và kết quả thực tế."),
    ('b', "Kỳ vọng thắng giữa hai thí sinh:  E_A = 1 / (1 + 10^((R_B − R_A)/400))."),
    ('b', "Vượt kỳ vọng ⇒ tăng điểm; kém kỳ vọng ⇒ giảm điểm."),
])

# ---------------- Slide 10: Trực quan hóa ----------------
content_slide("8. Trực quan hóa cấu trúc dữ liệu", [
    ('n', "Ý tưởng. Ghi lại trạng thái biến qua từng bước thực thi để dựng lại hoạt hình của cấu trúc dữ liệu (mảng, ngăn xếp, hàng đợi, cây, đồ thị…)."),
    ('h', "Kỹ thuật giả lập / chèn mã (code instrumentation)"),
    ('b', "Phân tích mã nguồn, chèn lệnh phát vết (trace) tại các điểm quan trọng."),
    ('b', "Thực thi trong sandbox, thu thập chuỗi trạng thái theo thời gian."),
    ('b', "Suy luận kiểu cấu trúc dữ liệu, chọn bộ dựng hình phù hợp để hiển thị."),
    ('h', "Ý nghĩa sư phạm"),
    ('b', "Giúp người học “nhìn thấy” thuật toán vận hành."),
])

# ---------------- Slide 11: LLM ----------------
content_slide("9. Tích hợp mô hình ngôn ngữ lớn (LLM)", [
    ('h', "Ứng dụng LLM trong hệ thống"),
    ('b', "Gợi ý học tập theo từng bài (không đưa lời giải trực tiếp)."),
    ('b', "Trích xuất đề bài từ tệp PDF; sinh ca kiểm thử."),
    ('h', "Kỹ thuật xây dựng chỉ dẫn (prompt engineering) và rào chắn (guardrail)"),
    ('b', "Nạp ngữ cảnh bài toán vào chỉ dẫn để câu trả lời bám sát nội dung."),
    ('b', "Ràng buộc phạm vi: từ chối câu hỏi lạc đề, chỉ hỗ trợ định hướng."),
    ('b', "Giữ vai trò trợ giảng – kích thích tư duy thay vì cho đáp án."),
])

# ---------------- Slide 12: Kết luận ----------------
content_slide("Kết luận", [
    ('h', "Các cơ sở lý thuyết đã vận dụng"),
    ('b', "Chấm bài tự động dựa trên ca kiểm thử và cơ chế phán quyết."),
    ('b', "Cô lập tài nguyên (cgroups, namespaces) cho thực thi an toàn."),
    ('b', "Kiến trúc phân tầng, REST không trạng thái, xử lý bất đồng bộ."),
    ('b', "Bảo mật: JWT, RBAC, băm mật khẩu, giới hạn tần suất."),
    ('b', "Mô hình chấm điểm cuộc thi và đánh giá năng lực theo Elo."),
    ('b', "Giả lập thực thi để trực quan hóa và tích hợp LLM hỗ trợ học tập."),
    ('c', "Xin cảm ơn – Kính mời Hội đồng đặt câu hỏi."),
])

out = "defense-slides.pptx"
prs.save(out)
print("Saved", out, "-", len(prs.slides.__iter__.__self__._sldIdLst), "slides")
