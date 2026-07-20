# Fix: chặn placeholder công thức lộ ra màn hình học sinh

## Lỗ hổng trước khi sửa

`regexParser.js` có sẵn `protectAssets()` để bảo vệ token dạng Azota (`[!m:$mathtype_n$]`,
`[[MATH:...]]`, `{{MATH:...}}`, `[MATH_n]`, `[!img:$...$]`) khỏi bị regex tách câu/A-D làm hỏng —
nhưng sau khi tách xong, các token này chỉ được **dán lại y nguyên**, không hề được resolve
thành công thức thật. Vì `views/quiz-take.ejs` và `quiz-result.ejs` render nội dung câu hỏi bằng
`<%- %>` (không escape), nếu một token dạng này lọt vào (dán tay, dữ liệu từ Azota, hoặc AI trả
về), nó sẽ hiển thị nguyên văn kiểu `[!m:$mathtype_2$]` trước mặt học sinh — vi phạm trực tiếp
yêu cầu "không hiển thị raw placeholder cho học sinh" và "không đưa placeholder vào MathJax/KaTeX".

Vấn đề này không xảy ra với luồng đọc `.docx` thông thường (vì OMML được chuyển thẳng thành
`<math>` MathML thật), nhưng là rủi ro thật với: dữ liệu dán tay từ nguồn khác, nội dung AI trả về,
hoặc dữ liệu Azota gốc có sẵn token này.

## Đã sửa

- Thêm `services/examImport/mathReference.js`: nhận diện mọi biến thể placeholder tham chiếu
  (không hardcode 1 cú pháp), và **luôn** thay token còn sót bằng một cảnh báo HTML an toàn
  (`⚠ [công thức bị thiếu — vui lòng chèn lại]`) — không còn dấu `$`/`[`/`]` nên không thể bị
  MathJax hiểu nhầm là LaTeX, và giữ lại `referenceId` để người duyệt biết cần chèn công thức nào.
- Gọi sanitize này ở **2 lớp**:
  1. Lúc parse (`regexParser.js` → `cleanInline`) để người duyệt đề thấy cảnh báo ngay trên
     màn hình xem trước, thay vì thấy chuỗi khó hiểu.
  2. Lúc ghi vào CSDL (`models/Quiz.js`, cả 4 hàm `addSingleChoiceQuestion` / `addTrueFalseQuestion`
     / `addShortAnswerQuestion` / `addEssayQuestion`) — đây là lớp bảo vệ cuối cùng, áp dụng cho
     **mọi nguồn dữ liệu** (bộ tách tự động, AI, hoặc giáo viên gõ/sửa tay ở form duyệt đề), đảm bảo
     không có đường nào bỏ qua được.
- Thêm `tests/mathReference.test.js`: xác nhận token không bao giờ còn sót ở output cuối, các
  công thức/ảnh đã resolve thật (MathML, `<img>`) không bị đụng vào, và A–D chứa placeholder vẫn
  tách đúng 4 phương án trước khi sanitize.
- `npm test` giờ chạy cả 2 bộ test (`examParser.test.js` + `mathReference.test.js`) — đã chạy thật,
  cả hai đều pass.

## Giới hạn còn lại (chưa làm, cần nói rõ)

- Đây là **lớp chặn an toàn**, không phải kho math-asset thật sự như đặc tả gốc mô tả (mục XI.2).
  Hệ thống hiện tại **không có nguồn dữ liệu thật** để resolve token `[!m:$mathtype_n$]` thành công
  thức thật (không có tích hợp API/kho asset của Azota) — nên khi gặp token này, hệ thống chỉ đảm
  bảo *không hiển thị sai/lộ dữ liệu thô*, chứ chưa thể tự hiển thị đúng công thức. Nếu cần resolve
  thật, phải có nguồn cấp dữ liệu asset tương ứng (ví dụ export kèm ảnh/MathML từ Azota) — việc đó
  nằm ngoài phạm vi sửa lần này.
- Chưa có UI riêng cho giáo viên "chèn lại công thức bị thiếu" ngay tại chỗ cảnh báo — hiện tại
  cảnh báo chỉ hiển thị trong nội dung text, giáo viên phải tự sửa lại trong ô nhập liệu.
