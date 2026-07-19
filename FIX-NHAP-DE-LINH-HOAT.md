# Bản fix nhập đề linh hoạt

Bản này thay bộ tách đề theo form cố định bằng parser dựa trên cấu trúc thực tế của tài liệu.

## Đã sửa

- Không cố định số phần, số câu hoặc số phương án.
- Nhận phương án A-H khi cùng dòng, khác dòng hoặc bố cục hỗn hợp.
- Bảo vệ placeholder công thức/ảnh trước khi tách câu và phương án.
- Nhận `[!m:$mathtype_n$]`, `[[MATH:...]]`, `[[IMG:n]]`, MathML và thẻ ảnh như một inline asset.
- Không coi placeholder MathType là LaTeX.
- Nhận phần đáp án và phần lời giải kể cả khi sau bảng đáp án không có tiêu đề “Lời giải”.
- Ghép đáp án/lời giải theo phần + số câu.
- Nhận đúng/sai với số lượng ý linh hoạt.
- Sửa lỗi badge HTML bị hiện thành chữ.
- Giao diện chỉnh sửa hỗ trợ tối đa 8 phương án.
- Thêm smoke test parser bằng `npm test`.

## Lưu ý

- File Word mẫu chỉ được dùng làm test; parser không khóa theo cấu trúc 12-4-6.
- Chất lượng PDF scan/ảnh phụ thuộc OCR và tài nguyên máy chủ.
- MathType dạng WMF/EMF dùng bộ chuyển đổi có trong dependencies; Dockerfile là phương án dự phòng khi cần LibreOffice.
