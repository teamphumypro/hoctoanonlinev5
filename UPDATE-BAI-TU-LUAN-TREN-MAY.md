# Bản cập nhật: Học sinh làm bài Toán tự luận trực tiếp trên máy

Bản này được xây trên `AZOTA Import Engine Rebuild V2` và chỉ mở rộng luồng làm/chấm câu tự luận.

## Học sinh có thể

- Gõ lời giải và lập luận bằng văn bản.
- Thêm nhiều khối công thức toán; có nút phân số, căn, lũy thừa, tích phân, tổng, π, bất đẳng thức…
- Viết/vẽ trực tiếp bằng chuột, bút cảm ứng hoặc màn hình cảm ứng.
- Tải ảnh bài làm vào đúng câu.
- Trộn văn bản, công thức, hình vẽ và ảnh trong cùng một bài giải.
- Bài đang làm được tự lưu tạm trên chính trình duyệt theo từng câu.

## Giáo viên chấm

Trang Bảng điểm hiển thị lại bài làm có cấu trúc thay vì chuỗi JSON: chữ, công thức, nét viết/vẽ và ảnh. Giáo viên nhập điểm như luồng chấm tay hiện có.

## Kỹ thuật

Bài làm được lưu trong `quiz_attempt_answers.answer_text` dưới dạng JSON block, không cần migration database:

- `text`
- `math`
- `drawing`
- `image`

Dữ liệu cũ dạng văn bản thuần vẫn hiển thị bình thường.

## File thay đổi

- `views/quiz-take.ejs`
- `views/quiz-result.ejs`
- `views/admin/quizzes/results.ejs`
- `public/js/math-essay-editor.js`
- `public/css/math-essay-editor.css`
