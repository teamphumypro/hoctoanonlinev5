# V4: Tái cấu trúc module nhập đề theo kiến trúc độc lập + vùng bài làm tự luận

## Đã làm theo đúng 3 việc bạn yêu cầu

### 1. Bỏ hẳn dạng sách lật
Xóa toàn bộ: `controllers/adminPdfExamController.js`, `services/examImport/pdfAutoDetect.js`,
`pdfPageText.js`, `views/quiz-take-pdf.ejs`, `pdf-import-*.ejs`. Trích riêng phần còn dùng được
(`parseAnswerKey` — bảng đáp án dạng bảng) sang `answerTableParser.js` rồi sau đó **chuyển tiếp
vào kiến trúc V4** (xem bên dưới). `quizController.js`/`quiz-result.ejs` không còn nhánh PDF nào.

### 2. Kiến trúc V4 — đúng theo bạn đề xuất
```
services/exam-import/
├── core/           ImportEngine.js (điểm vào duy nhất), ImportResult.js
├── readers/        DocxReader.js
├── extractors/     MathExtractor.js, ImageExtractor.js, ommlToMathml.js
├── analyzers/      SectionDetector, QuestionDetector, QuestionTypeDetector,
│                   AnswerDetector, SolutionDetector
├── render/         HtmlRenderer, PlaceholderRenderer
├── validator/      Validator.js
└── tests/          analyzers.test.js, ImportEngine.test.js, fixtures/ (file .docx + .txt thật)
```
Dùng đúng như bạn viết:
```js
const exam = await ExamImportEngine.import(file);
// { title, sections, questions, assets, solutions, rubrics, summary }
```
Controller (`adminDocxExamController.js`) giờ chỉ còn gọi `ExamImportEngine.import()` — không còn
regex/parser nào nằm trong controller nữa.

**Một điều tôi làm khác ý ban đầu, và lý do:** tôi **không viết lại từ đầu**, mà **di chuyển
logic đã kiểm chứng thật** (22/22 câu đúng trên file đề thi thật của bạn) vào đúng cấu trúc thư mục
mới. Viết lại từ đầu sẽ mất hết phần đã test — quay lại đúng rủi ro đoán mò gây ra toàn bộ lỗi
trước đây. Trong lúc tái cấu trúc, tôi **tìm thêm được 1 bug thật**: khi ghép 2 chiến lược dò đáp
án (đọc từ lời giải + bảng đáp án dự phòng), bảng đáp án dự phòng có regex lỏng bắt nhầm số trong
văn xuôi lời giải thành "câu số 1856" giả — đã sửa: chỉ dùng bảng dự phòng cho **đúng phần** nào
lời giải chưa cho đáp án nào, không trộn lẫn.

**Vì sao `docxRichExtractor.js`, `mathReference.js`... cũ vẫn còn trong repo:** chúng đang phục vụ
tính năng **"Đọc sách online"** không liên quan — xóa sẽ phá tính năng đó. Module `exam-import/`
mới **hoàn toàn độc lập, không dùng chung code** với chúng (kể cả phải chép lại 1 đoạn logic WMF,
chấp nhận trùng lặp một chút để đổi lấy sự độc lập thật sự như bạn yêu cầu).

**Đã kiểm chứng lại toàn bộ sau khi tái cấu trúc:** `services/exam-import/tests/analyzers.test.js`
chạy trực tiếp trên văn bản thật, `npm test` — **vẫn 22/22 câu đúng, 0 câu cần xem lại thủ công**,
y hệt trước khi tái cấu trúc. `ImportEngine.test.js` là test tích hợp đầy đủ dùng **chính file
.docx thật** — tự động bỏ qua trong môi trường tôi đang chạy (thiếu `jszip`/`fast-xml-parser` vì
không có mạng để cài), nhưng sẽ chạy thật khi bạn `npm install` trên máy/server thật.

**Còn thiếu so với đề xuất của bạn** (nói rõ, không giấu): `readers/PdfReader.js`, `HtmlReader.js`,
`extractors/TableExtractor.js` (bảng biến thiên hiện chỉ được giữ nguyên dạng ảnh nhúng, chưa có
xử lý cấu trúc bảng riêng), và `rubrics`/`solutions` ở cấp top-level của kết quả trả về hiện để
rỗng (lời giải mỗi câu đã được gắn thẳng vào `question.explanation` thay vì để riêng — đơn giản
hơn cho bản này, có thể tách ra sau nếu cần).

### 3. Vùng bài làm tự luận (gõ chữ + công thức kiểu Word + viết tay)
Nối trực tiếp vào `views/quiz-take.ejs` — đúng theo bản mockup đã duyệt với bạn: gõ chữ bình
thường, 3 nút chèn công thức (phân số/căn/lũy thừa) chèn ngay tại vị trí con trỏ, nút "Viết tay"
mở canvas vẽ bằng chuột rồi chèn ảnh vào bài làm.

**Bảo mật đã xử lý (quan trọng vì đây là dữ liệu học sinh nhập):** viết
`services/security/sanitizeHtml.js` — lọc bỏ `<script>`, mọi thuộc tính `on*`, `style`, link ảnh
trỏ ra ngoài (chỉ cho phép ảnh dạng `data:image/...` do chính học sinh vẽ), trước khi lưu vào CSDL
và trước khi hiển thị lại cho giáo viên chấm. Test `sanitizeHtml.test.js` — 7 kịch bản tấn công
XSS thực tế, tất cả đều bị chặn đúng. **Giới hạn thật:** đây là bộ lọc dựa trên regex (allowlist
thẻ/thuộc tính), không phải trình phân tích HTML/DOM chuẩn như thư viện `sanitize-html`/`DOMPurify`
— vì môi trường không có mạng để cài thêm gói. Đã ghi rõ trong code: nếu sau này có điều kiện cài
npm package, nên thay bằng thư viện chuẩn để chắc chắn hơn.

Cập nhật cả `views/admin/quizzes/results.ejs` (giáo viên chấm) và `views/quiz-result.ejs` (học
sinh xem lại) để hiển thị đúng dạng HTML đã lọc, thay vì chữ thô.

## Đã test được — chạy thật
```
npm test
```
5 bộ: `mathReference`, `pdfImageExtractor` (2 bộ này thuộc tính năng Đọc sách online, không đổi),
`sanitizeHtml` (7 ca chống XSS), `exam-import/analyzers` (22/22 câu đề thật), `ImportEngine`
(tích hợp đầy đủ, tự bỏ qua an toàn khi thiếu thư viện). Tất cả pass.

## Việc bạn cần làm để xác nhận
1. `npm install` (cài đủ `jszip`, `fast-xml-parser`, `sharp` — đã có sẵn trong package.json) rồi
   `npm test` — lần này `ImportEngine.test.js` sẽ chạy thật trên file .docx thật, không còn bị bỏ qua.
2. Thử upload lại đúng file đề thi 103 qua `/admin/bai-kiem-tra/:id/tai-de` — xem 22 câu có hiện
   đúng công thức, đúng đáp án như đã kiểm chứng không.
3. Thử làm 1 câu tự luận ở màn hình học sinh — gõ chữ, chèn phân số, thử viết tay — xem có mượt
   không, giáo viên vào `results.ejs` xem có hiển thị đúng bài làm không.
