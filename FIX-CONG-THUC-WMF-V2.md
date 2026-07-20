# Fix V2: công thức WMF hiển thị thành nét vẽ rác (không còn chữ số/ký hiệu)

## Bằng chứng lỗi

Ảnh chụp màn hình thực tế từ production: câu hỏi "Nghiệm của phương trình [công thức] là" —
công thức hiển thị ra chỉ còn vài nét cong/dấu phẩy đen vô nghĩa, phương án A chỉ còn 1 gạch
ngang — không còn chữ số, biến số hay ký hiệu toán học nào đọc được.

## Nguyên nhân gốc

Bản fix V1 (`FIX-CONG-THUC-WMF.md`) đã đúng khi polyfill `FileReader` để `emf-converter` chạy
được trên Node, và **về mặt kỹ thuật nó không báo lỗi** — nó trả về một ảnh PNG hợp lệ. Nhưng
`emf-converter` là thư viện JS nhẹ, chỉ vẽ lại được các lệnh đồ họa vector cơ bản (đường thẳng,
đa giác...) trong file WMF — nó **không đọc được record văn bản/glyph (ExtTextOut)** mà MathType
dùng để vẽ chữ số và ký hiệu. Kết quả: ảnh "thành công" về mặt kỹ thuật (có trả về data), nhưng
nội dung sai — chỉ còn các nét vector rời rạc (dấu ngoặc, gạch phân số...), mất hết chữ.

Vì bước này không hề throw lỗi, code cũ (ưu tiên JS trước, chỉ rơi xuống LibreOffice khi JS lỗi
hẳn) **không bao giờ chạm tới LibreOffice** — dù server đã cài sẵn LibreOffice qua Dockerfile.

## Đã sửa

- Đảo thứ tự ưu tiên: nếu server có `soffice` (kiểm tra 1 lần, cache lại) → dùng LibreOffice
  làm phương án **chính**, vì nó đọc đúng chuẩn WMF/EMF đầy đủ (kể cả record văn bản/font) nhờ
  tương thích engine Microsoft Office thật — đây là lý do MathType-generated WMF cần một bộ đọc
  đúng chuẩn, không phải bộ vẽ vector rút gọn.
- Thư viện JS thuần (`emf-converter`) giờ chỉ còn là phương án **dự phòng cho môi trường không
  cài LibreOffice** (ví dụ deploy Node thường trên Render không dùng Dockerfile) — vẫn giữ lại để
  hệ thống không bị crash/mất tính năng hoàn toàn trong trường hợp đó, nhưng đã ghi rõ trong code
  và Dockerfile rằng chất lượng có thể kém hơn.
- Cập nhật `Dockerfile`: đổi comment từ "tùy chọn, không bắt buộc" thành "đường chính được khuyến
  nghị" — nói đúng vai trò thật của nó sau khi sửa.
- Tách hàm rõ ràng: `convertViaLibreOffice()` và `convertViaJsLibrary()` để dễ kiểm thử/bảo trì
  riêng từng phương án, thay vì gộp chung trong 1 hàm dài.

## Giới hạn còn lại — nói thật, không giấu

- **Tôi không có file WMF thật của bạn để render và so sánh trực tiếp** (không có mạng để cài
  `emf-converter`/`@napi-rs/canvas`/LibreOffice trong môi trường tôi đang chạy, và không có file
  DOCX/WMF gốc gây lỗi trong ảnh chụp màn hình). Vì vậy tôi **không thể tự chạy lại đúng file gây
  lỗi để xác nhận bằng mắt là đã hết méo** — tôi chỉ sửa được đúng nguyên nhân kiến trúc đã xác
  định rõ ràng (thứ tự ưu tiên sai khiến LibreOffice không bao giờ được dùng dù có sẵn), dựa trên
  bằng chứng chắc chắn từ ảnh chụp màn hình và cách `emf-converter` hoạt động.
- Nếu server thật của bạn **không dùng Dockerfile** (deploy Node trực tiếp trên Render, không có
  LibreOffice) thì bản sửa này **không giải quyết được** vấn đề — vì khi đó hệ thống vẫn phải
  dùng `emf-converter` (phương án dự phòng), cho ra kết quả y hệt lỗi trong ảnh. Trong trường hợp
  đó, bắt buộc phải deploy bằng Dockerfile có sẵn trong repo (đã cài LibreOffice) thì công thức
  WMF mới hiển thị đúng.
- **Cách xác nhận chắc chắn nhất**: bạn build lại bằng Dockerfile này, upload lại đúng file Word
  đã gây lỗi trong ảnh, và xem công thức Câu 1 có hiển thị đúng chữ số/ký hiệu hay chưa. Nếu vẫn
  còn lỗi ở đúng câu đó, gửi lại tôi ảnh mới (hoặc tốt nhất là chính file Word) để tôi khoanh vùng
  tiếp — có thể khi đó là 1 dạng WMF cụ thể mà cả LibreOffice cũng xử lý chưa đúng.
