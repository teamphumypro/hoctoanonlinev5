# Bản sửa PDF lật trang và chấm điểm

- Cho phép quản trị xem PDF ngay sau upload, trước khi bật `pdf_exam_mode`.
- Sửa lỗi `/admin/bai-kiem-tra/:id/de.pdf` trả 404 tại màn hình kiểm tra.
- Giữ hiệu ứng lật trang và nút mở PDF gốc.
- Làm rõ 4 dạng câu trong màn hình cấu hình:
  - Trắc nghiệm: chấm tự động theo A/B/C/D.
  - Đúng/Sai: nhập đáp án dạng `Đ,S,Đ,Đ`, chấm theo số ý đúng.
  - Trả lời ngắn: chấm tự động; hỗ trợ nhiều đáp án cách nhau bằng `|` hoặc `;`; chuẩn hóa `5,91` và `5.91`.
  - Tự luận: học sinh nhập bài, giáo viên chấm tay sau khi nộp.
- Xóa phần JavaScript/EJS cũ bị lặp trong `quiz-take.ejs`.
