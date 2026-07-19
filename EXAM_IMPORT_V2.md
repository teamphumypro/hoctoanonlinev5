# Nhập đề tự động V2

Phần nhập đề cũ đã được thay bằng quy trình mới:

1. Nhận file DOCX, PDF có chữ, PDF scan, JPG/PNG hoặc Google Drive.
2. DOCX giữ ảnh, bảng và công thức Equation/MathType ở đúng vị trí tối đa có thể.
3. Tự nhận Phần I trắc nghiệm, Phần II đúng/sai, Phần III trả lời ngắn.
4. Đọc bảng đáp án cuối đề kể cả khi mỗi ô Word bị tách thành một dòng riêng.
5. Tách phần lời giải sau bảng đáp án và ghép theo Phần + số câu.
6. Màn hình hai cột, sửa trực tiếp ở cả preview bên trái và dữ liệu bên phải.
7. Bấm đáp án bên trái hoặc bên phải đều đồng bộ.

Triển khai Render bằng Docker để có LibreOffice (WMF/EMF), Poppler (PDF scan) và Tesseract OCR tiếng Việt.
