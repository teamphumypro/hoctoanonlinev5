# Bản cập nhật lớn: chuyển "Thực chiến phòng thi" sang PDF sách lật

## Đã loại bỏ hoàn toàn (đúng yêu cầu)

Xóa hẳn pipeline nhập đề kiểu cũ (đọc-hiểu-tách-lại nội dung câu/phương án/công thức từ Word/PDF):

- `controllers/adminExamImportController.js`
- `services/examImport/regexParser.js` (bộ tách câu/phương án/đáp án/lời giải bằng regex)
- `services/ai/examAiParser.js` (nhận diện bằng AI)
- `views/admin/quizzes/import-upload.ejs`, `import-review.ejs`
- `tests/examParser.test.js`, `tests/fullExamAssembly.test.js`

Toàn bộ những lỗi tôi từng vá đi vá lại (OMML mất công thức, WMF méo thành nét rác, câu cuối phần nuốt tiêu đề phần sau, placeholder Azota rò rỉ...) đều thuộc pipeline này — **giờ không còn tồn tại nữa vì không còn ai đọc-hiểu-tái tạo nội dung câu hỏi**. Trang PDF gốc được hiển thị y nguyên cho học sinh.

## Vẫn giữ lại (đừng nhầm là chưa dọn xong — đây là cố ý)

`services/examImport/extractText.js`, `docxRichExtractor.js`, `ommlToMathml.js`, `pdfImageExtractor.js`, `mathReference.js` **vẫn còn trong code**, nhưng **không còn được dùng bởi Thực chiến phòng thi nữa**. Lý do giữ lại: chúng đang được tính năng **"Đọc sách online" (tách chương từ Word/PDF)** dùng — một tính năng hoàn toàn khác, chưa từng bị bạn phàn nàn, xóa đi sẽ làm hỏng nó. Đây là ranh giới rõ ràng giữa "phương án cũ cho đề thi" (đã bỏ) và "hạ tầng dùng chung cho tính năng khác" (giữ nguyên).

## Kiến trúc mới

1. **Giáo viên upload 1 file PDF đề thi** (có kèm bảng đáp án ở cuối) tại `/admin/bai-kiem-tra/:id/tai-de`.
2. Server đọc text từng trang (`pdfPageText.js`, dùng `pdf-parse`) rồi **tự động phát hiện** (`pdfAutoDetect.js`):
   - Câu N nằm ở **trang nào** (dựa vào dòng "Câu N" xuất hiện ở trang nào).
   - **Loại câu** (trắc nghiệm/đúng-sai/trả lời ngắn) — đoán qua việc có chuỗi nhãn A-D hay a-d tăng dần hay không, **không tách nội dung** như cách cũ.
   - **Đáp án đúng** — tái sử dụng nguyên bộ dò bảng đáp án đã test kỹ trước đây (xử lý đúng đề 3 phần I/II/III).
3. Giáo viên xem lại ở màn hình duyệt (`pdf-import-review.ejs`) — xem trước từng trang PDF thật (qua pdf.js) song song với bảng metadata **có thể sửa tay từng ô**: trang, loại câu, số phương án, đáp án đúng, điểm. Câu nào không dò được đáp án sẽ có nhãn cảnh báo màu vàng để giáo viên tự kiểm tra — không âm thầm lưu sai.
4. Lưu: chỉ lưu **file PDF gốc** + bảng metadata nhẹ (không còn lưu nội dung/công thức dạng văn bản tái tạo).
5. **Học sinh làm bài** (`quiz-take-pdf.ejs`): xem PDF dạng lật trang (pdf.js), bảng trả lời bên cạnh tự đổi theo đúng trang đang xem, có nút nhảy nhanh theo số câu. Trên màn hình hẹp, tự chuyển sang 2 tab "Đề thi"/"Bài làm" thay vì chia đôi màn hình chật — đúng như đã thống nhất ở bản demo trước.
6. **Chấm điểm giữ nguyên 100%** logic cũ trong `models/Quiz.js` (`Quiz.grade`, `addSingleChoiceQuestion`...) — vì bản chất vẫn là "câu N, học sinh chọn phương án mấy", chỉ khác nguồn nội dung hiển thị. Không đụng vào logic chấm điểm đang chạy ổn định.

## Bảo mật đã xử lý

Vì bảng trả lời được dựng động bằng JS theo trang, dữ liệu câu hỏi phải nhúng vào trang dưới dạng JSON cho trình duyệt đọc — **đã lọc bỏ hoàn toàn đáp án đúng** trước khi nhúng (`quizController.js`, hàm `take`), chỉ gửi id/loại câu/số phương án. Nếu không lọc, học sinh mở "View Source" sẽ thấy ngay đáp án — đây là lỗi bảo mật tôi chủ động phòng trước, không phải bạn yêu cầu riêng.

## Đã test được (chạy thật)

`npm test` chạy 3 bộ: `mathReference.test.js`, `pdfImageExtractor.test.js` (không đổi, vẫn dùng cho tính năng sách online), và `pdfAutoDetect.test.js` (mới — mô phỏng PDF 3 trang, đề 2 phần, xác nhận nhận đúng trang/loại câu/đáp án, không lẫn Câu 1 Phần I với Câu 1 Phần II). Tất cả pass.

## KHÔNG test được — nói thật

- **Toàn bộ luồng qua Postgres thật** (lưu câu hỏi, chấm điểm, hiển thị lại) — môi trường tôi chạy không có Postgres và không cài được `node_modules` (không có mạng), nên không `npm start` lên thử được.
- **3 file `.ejs` mới** — chỉ kiểm tra được cân bằng thẻ `<% %>` và đọc tay kỹ, **chưa render thử qua engine EJS thật** vì không cài được gói `ejs` để test.
- **pdf.js thật trong trình duyệt** — logic dùng đúng pattern đã chạy ổn định trong `online-book-read.ejs` (cùng dự án), nhưng chưa tự mắt xác nhận trang PDF thật hiển thị đúng trong flow thi.

## Việc bạn cần làm để xác nhận chắc chắn

1. Chạy `npm run migrate` (thêm cột `pdf_source_path`, `pdf_total_pages`, `page_number` — không ảnh hưởng dữ liệu cũ, dùng `ADD COLUMN IF NOT EXISTS`).
2. Vào 1 đề thi bất kỳ trong "Thực chiến phòng thi" → "Tải đề" → thử upload 1 file PDF đề thi thật (có đáp án).
3. Kiểm tra bảng duyệt có nhận đúng trang từng câu không — sửa tay nếu sai.
4. Lưu, rồi vào làm thử với 1 tài khoản học viên — kiểm tra lật trang, bảng trả lời đổi đúng, nộp bài chấm đúng điểm.

Nếu bước nào lỗi, gửi tôi ảnh chụp màn hình + mô tả đúng bước bị lỗi, tôi sẽ sửa đúng chỗ đó thay vì đoán tiếp.
