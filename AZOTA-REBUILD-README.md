# AZOTA Import Engine Rebuild

Bản này bỏ luồng PDF lật trang và thay module nhập đề bằng pipeline mới:

1. Đọc DOCX theo đúng thứ tự XML.
2. Tách OMML/MathType/hình thành kho asset riêng.
3. Chèn placeholder `[!m:$mathtype_n$]` và `[img:$img_n$]` đúng vị trí.
4. Bảo vệ placeholder trước khi tách phần, câu và phương án A-H.
5. Tự tách vùng đề, bảng đáp án và lời giải.
6. Ghép đáp án/lời giải theo `section + question number`.
7. Màn hình biên tập hai cột: trực quan bên trái, nguồn placeholder bên phải.

## Không hardcode

Không cố định số phần, số câu, số phương án hoặc vị trí bảng đáp án. File Word mẫu chỉ là dữ liệu kiểm thử.

## Triển khai

- Giải nén trực tiếp vào project root.
- Push GitHub.
- Render dùng Node 20.x theo `package.json`.
- Build/Start command giữ theo cấu hình dự án hiện có.

## Lưu ý

Các câu đã import sai trước đây cần xóa và upload lại vì dữ liệu lỗi đã được lưu trong database.
