# Bản cập nhật Thực chiến phòng thi — Đề PDF nguyên bản

## Thay đổi chính

- Bỏ luồng bóc tách Word/công thức/hình ảnh để dựng lại đề.
- Giáo viên tải một file PDF; hệ thống giữ nguyên trang PDF trong PostgreSQL.
- Tự phát hiện phần, số câu, loại câu, trang chứa câu và bảng đáp án.
- Màn hình kiểm tra cho phép sửa thủ công trang, dạng câu, số lựa chọn, điểm và đáp án.
- Học sinh làm bài theo giao diện hai cột: đề PDF bên trái, bài làm bên phải.
- Chọn câu sẽ tự mở đúng trang PDF.
- Điện thoại không chia màn hình: dùng hai tab Đề thi/Bài làm.
- Dữ liệu PDF được lưu trong database, không mất khi Render restart.

## Kiểm thử mẫu

File mẫu 18 trang được nhận đúng 22 câu:
- Phần I: 12 câu trắc nghiệm.
- Phần II: 4 câu đúng/sai.
- Phần III: 6 câu trả lời ngắn.
- Tự ánh xạ trang: 1–2, 2–3 và 3–5.
- Tự đọc đáp án D/B/C/...; Đ/S từng ý; 1856, 1275, 5,91, 1152, 1990, 7,35.

## Triển khai

Đẩy toàn bộ source lên GitHub và chạy migration hiện tại. Schema tự tạo bảng `quiz_pdf_documents` và các cột PDF mới.
