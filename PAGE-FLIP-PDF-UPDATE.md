# Bản cập nhật PDF lật trang

- Bỏ hoàn toàn canvas/PDF.js CDN ở màn hình kiểm tra và màn hình học sinh.
- Dùng trình xem PDF gốc của trình duyệt, đặt trong hai “tờ giấy” chồng nhau để tạo hiệu ứng lật trang 3D.
- Thêm HTTP Range (206 Partial Content) cho route PDF. Đây là phần quan trọng để Chrome/Edge tải PDF trong iframe ổn định, không còn khung trắng.
- Chọn câu bên phải sẽ tự lật tới trang đã gán.
- Giáo viên vẫn sửa thủ công trang, loại câu, điểm và đáp án.
- Trên điện thoại vẫn dùng hai tab Đề thi/Bài làm để không làm màn hình quá nhỏ.
- Có nút Mở PDF gốc làm phương án dự phòng.

Sau khi cập nhật, chỉ cần push GitHub và deploy lại. Các đề PDF đã lưu trước đó vẫn dùng được, không cần upload lại.
