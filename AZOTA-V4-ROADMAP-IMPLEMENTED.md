# AZOTA V4 – nền tảng lộ trình đã triển khai

Phiên bản này bắt đầu tách module nhập đề khỏi controller và parser cũ.

## Đã triển khai trong V4

1. `services/exam-import/core/ImportEngine.js` là đầu vào duy nhất của module nhập đề.
2. Reader DOCX được tách riêng; định dạng khác đi qua fallback reader.
3. Analyzer, validator và mô hình kết quả `ImportResult` tách riêng.
4. Controller chỉ gọi `importExam(filePath)` từ `services/exam-import`.
5. Wrapper tương thích giữ các đường dẫn cũ không bị hỏng.
6. Kết quả nhập đề có `version`, `source`, `warnings` và `stats` để editor/chấm AI dùng sau này.
7. Có kiểm tra merge conflict tự động trước khi server khởi động.
8. Có bộ test V1, V2 và V4.
9. Giao diện làm bài tự luận trực tiếp trên máy của V3 được giữ nguyên.

## Các giai đoạn tiếp theo trên nền tảng này

- Review editor dạng block thống nhất cho câu hỏi, công thức, ảnh và lời giải.
- Rubric editor cho bài tự luận.
- Teacher grading workspace và AI đề xuất điểm.
- Reader PDF/HTML riêng, không trộn logic vào DOCX.
