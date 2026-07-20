# Nút chọn đáp án đè trực tiếp lên trang PDF (gần cảm giác Azota hơn)

## Vì sao làm theo cách này thay vì tái tạo nội dung như Azota thật

Bạn muốn cảm giác giống Azota (bấm ngay vào đáp án trên đề, không phải khung riêng). Cách Azota thật làm — tái tạo toàn bộ nội dung câu hỏi thành HTML, chèn công thức đúng vị trí — chính là thứ đã liên tục gãy trong suốt các bản trước (OMML, WMF, ranh giới câu/phần), vì tôi không có file thật của bạn hay môi trường có mạng để test lặp lại cho chắc.

Cách này đạt được **cảm giác tương tác giống Azota** mà **không đụng vào nội dung**: dùng toạ độ chữ thật mà pdf.js đọc được ngay trên trang PDF gốc để đặt 1 nút bấm tròn đè lên đúng vị trí chữ "A.", "B.", "C.", "D." (hoặc "a)", "b)"...). Bấm vào đó = chọn đáp án. Nội dung/công thức vẫn là ảnh trang PDF 100%, không tái tạo gì nên không thể méo.

## Cách hoạt động

1. Sau khi pdf.js vẽ xong 1 trang, gọi `page.getTextContent()` lấy vị trí thật (toạ độ x,y) của từng chữ trên trang.
2. Gom các chữ thành từng "dòng" theo độ gần trục y, tìm các nhãn "A." "B." "C." "D." hoặc "a)" "b)" "c)" "d)" (kể cả khi bị tách thành 2 mảnh như "A" + ".").
3. Gán các nhãn tìm được cho đúng câu hỏi trên trang, theo đúng **số lượng phương án server đã báo trước** (không tự đoán lại loại câu ở bước này).
4. Đặt 1 nút tròn tại đúng toạ độ đó, bấm vào sẽ cập nhật cùng 1 dữ liệu `answers` với bảng bên phải — **hai bên luôn đồng bộ hai chiều**.

## An toàn — không bao giờ chặn việc làm bài

Đây là lớp làm đẹp thêm, không phải đường duy nhất:
- Nếu không tìm đủ số nhãn tin cậy cho 1 câu (PDF có font/layout đặc biệt, chữ bị tách khác thường...) → **âm thầm bỏ qua câu đó**, không đặt nút gì cả.
- Nếu `getTextContent()` lỗi hoàn toàn (PDF hỏng, quá đặc biệt) → bắt lỗi, ghi log, không crash trang.
- **Bảng trả lời bên phải luôn hoạt động bình thường trong mọi trường hợp** — kể cả khi lớp nút bấm trên PDF không định vị được gì cả, học sinh vẫn làm bài được y như trước.

## Đã kiểm tra được

Cú pháp JS nhúng trong view đã được trích ra và `node --check` xác nhận hợp lệ (sau khi thay giả các chỗ EJS). Thẻ `<% %>` cân bằng.

## KHÔNG kiểm tra được — nói thật

Đây là phần rủi ro nhất trong tất cả những gì đã làm: **tôi chưa từng chạy thử trên 1 file PDF thật trong trình duyệt thật**, vì môi trường không có Chrome/pdf.js thật để thử. Thuật toán ghép nhãn dựa trên giả định về cách pdf.js trả toạ độ và cách chữ bị tách thành item — với PDF thật (nhất là PDF scan lại từ ảnh, hoặc font nhúng đặc biệt), có thể:
- Không tìm được nhãn nào (rơi về bảng bên phải như bình thường — an toàn).
- Đặt nút hơi lệch vị trí (do cách tính `height`/`x` từ ma trận transform chưa đúng 100% với mọi loại font).

**Bạn cần tự mắt xác nhận** trên đúng file PDF thật của mình: mở trang làm bài, xem nút tròn có xuất hiện đúng cạnh A/B/C/D không, bấm thử có chọn đúng đáp án không. Nếu lệch vị trí hoặc không hiện, chụp màn hình gửi tôi — đây là loại lỗi tôi cần thấy hình ảnh thật mới sửa đúng được, vì tôi không đoán được toạ độ chính xác từ xa.
