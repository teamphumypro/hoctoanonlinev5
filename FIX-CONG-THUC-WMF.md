# Fix công thức MathType WMF/EMF trên Node.js

Lỗi cũ: `emf-converter` dùng API trình duyệt `FileReader`, trong khi Node.js 20 không có API này. Vì vậy toàn bộ công thức MathType dạng WMF/EMF bị thay bằng dòng `[công thức - chưa hiển thị được, vui lòng sửa tay]`.

Bản này bổ sung `FileReader` polyfill phía server trước khi gọi `emf-converter`, chuyển WMF/EMF thành PNG và giữ đúng vị trí `[[IMG:n]]` trong nội dung.

Đã thử trực tiếp với file Word mẫu:
- 368 ảnh/công thức được trích xuất.
- 0 placeholder báo lỗi công thức.
- Câu trắc nghiệm A–D vẫn được nhận đúng.
