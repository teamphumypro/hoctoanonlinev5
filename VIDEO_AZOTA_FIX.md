# Bản fix theo video “cách thức tạo đề thi”

Phạm vi: chỉ quy trình tải đề và màn hình rà soát/nhập liệu của mục **Thực chiến phòng thi**.

## Đã đối chiếu từ video
- Tải file Word lên và chuyển sang màn hình chia đôi.
- Bên trái là bản đề thực tế theo từng phần/câu; bên phải là nội dung nhập liệu có số dòng.
- Thanh công cụ gồm chia điểm, thông tin đề, đi đến câu, upload lại, chọn dạng câu, công thức và ảnh.
- Có bảng chia điểm theo từng phần và tổng điểm.
- Có bảng điều hướng nhanh theo số câu.
- Có kiểm tra lỗi nhận diện trước khi lưu.
- Có thể bấm trực tiếp đáp án bên trái để cập nhật đáp án đúng vào nội dung bên phải.

## Lỗi quan trọng đã sửa
- Phần III trước đây bị nhận nhầm thành Phần II do kiểm tra chuỗi `II` nằm trong `III`.
- Dữ liệu Đúng/Sai có một đáp án đúng duy nhất từng có thể bị xử lý sai kiểu mảng ở controller.
- Trình phân tích nay giữ nội dung nhiều dòng của câu hỏi, phương án và lời giải tốt hơn.
- Màn hình upload đã mô tả đúng khả năng giữ ảnh và Word Equation.
