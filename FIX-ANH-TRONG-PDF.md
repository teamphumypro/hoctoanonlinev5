# Fix: PDF không còn mất toàn bộ ảnh nhúng

## Trước khi sửa

`extractFromPdf()` chỉ gọi `pdf-parse` lấy text thuần. Mọi ảnh minh họa, hình học, bảng biến
thiên dạng ảnh, hoặc công thức được nhúng dưới dạng ảnh trong file PDF đều **mất hoàn toàn**,
không để lại dấu vết gì trong nội dung (không có cả `[[IMG:n]]` để giáo viên biết mà tự chèn lại).

## Đã sửa

- Thêm `services/examImport/pdfImageExtractor.js` — tự viết bằng Node builtin (không cần cài
  thêm thư viện, vì môi trường build không có mạng), quét trực tiếp cấu trúc object/dictionary/
  stream trong byte PDF để lấy ra các ảnh nhúng dạng JPEG (`/Filter /DCTDecode`), và xác định
  ảnh đó thuộc trang nào qua `/Resources /XObject` của từng object `/Type /Page`.
- `extractFromPdf()` giờ dùng hook `pagerender` của `pdf-parse` để lấy text theo từng trang,
  rồi chèn `[[IMG:n]]` của đúng trang đó vào cuối nội dung trang — dùng lại đúng cơ chế
  `[[IMG:n]]` đã có sẵn cho DOCX, nên không cần sửa gì ở `regexParser.js`/`examAiParser.js`.
- 3 lớp an toàn để không làm hỏng tính năng đọc PDF đang chạy ổn định:
  1. Nếu trích ảnh lỗi → bắt lỗi, tiếp tục đọc chữ bình thường, không mất tính năng cũ.
  2. Nếu `pagerender` lỗi → quay về cách gọi `pdf-parse` mặc định như trước khi sửa.
  3. Nếu không quét được ảnh nào (PDF hiện đại nén object trong `/ObjStm`) → trả về rỗng,
     không crash, hành vi giống hệt trước khi có bản fix này.
- Test `tests/pdfImageExtractor.test.js`: tự dựng 1 file PDF tối giản 2 trang bằng tay (không
  cần file PDF mẫu thật, không cần thư viện tạo PDF) với 1 ảnh JPEG giả ở trang 2 — xác nhận
  trích đúng 1 ảnh, gán đúng vào trang 2 (không lẫn sang trang 1), và không crash với PDF hỏng.
  Đã chạy `npm test` thật — 3 bộ test đều pass.

## Giới hạn còn lại (nói rõ, không giấu)

- **Chỉ hỗ trợ ảnh nén JPEG** (`/Filter /DCTDecode`) — phổ biến nhất khi xuất PDF từ Word/
  LibreOffice/Google Docs. Ảnh bitmap không nén (FlateDecode thô) chưa được hỗ trợ.
- **Không hoạt động với PDF nén object stream** (`/ObjStm`, PDF 1.5+ thường gặp khi xuất từ
  Acrobat/InDesign đời mới) — khi đó sẽ không trích được ảnh nào (nhưng vẫn đọc chữ bình
  thường, không tệ hơn trước khi sửa).
- **Vị trí ảnh là xấp xỉ theo trang**, chèn ở cuối nội dung trang, **không phải đúng vị trí
  inline giữa câu** như DOCX — vì xác định vị trí chính xác cần phân tích toàn bộ content
  stream (thứ tự lệnh `Tj`/`TJ`/`Do`), ngoài phạm vi bản fix này. Nếu 1 trang có nhiều câu và
  nhiều ảnh, giáo viên cần tự kiểm tra lại ảnh nào thuộc câu nào khi duyệt đề.
- **Vẫn không phục hồi được công thức Toán vẽ bằng font/vector trong PDF** (khác với công thức
  chèn dưới dạng ảnh — loại đó đã trích được). Đây là hạn chế khó giải quyết nếu không có thư
  viện render PDF đầy đủ (pdfjs-dist/poppler), mà môi trường hiện tại không cài được do không
  có mạng.
- **PDF scan (toàn trang là ảnh chụp, không có lớp chữ)** vẫn cần OCR — tính năng OCR hiện đang
  tắt trên server (xem `extractFromImage`), không nằm trong phạm vi bản fix lần này.
