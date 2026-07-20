# Fix: lắp ráp đề + đáp án + lời giải thành 1 đề hoàn chỉnh

## Cách phát hiện

Không dùng lại các test đơn giản hoá kiểu "1 phần, 2 câu" như trước. Tôi tự dựng 1 đề mô phỏng
**đúng cấu trúc đề thi THPT thật**: 3 phần (trắc nghiệm A–D, đúng/sai, trả lời ngắn), mỗi phần
đánh số lại từ Câu 1, có bảng đáp án riêng từng phần và lời giải riêng từng phần
(`tests/fullExamAssembly.test.js`). Chạy thử phát hiện ra **3 lỗi dây chuyền** — đúng kiểu
"hết lỗi này đến lỗi khác" mà trước đó không lỗi nào lộ ra vì các test cũ chỉ có 1–2 phần đơn giản.

## 3 lỗi đã sửa

**1. Đề có từ 3 phần trở lên: đáp án Phần II/III bị cắt nhầm sang vùng lời giải.**
`splitDocument()` dùng heuristic "tìm lần thứ 2 xuất hiện tiêu đề Phần I" để biết đâu là ranh
giới giữa bảng đáp án và lời giải chi tiết — nhưng regex cũ khớp "PHẦN I" là *tiền tố* của cả
"PHẦN II" và "PHẦN III" (thiếu ranh giới từ), nên với đề 3 phần, ngay dòng "PHẦN II" trong chính
bảng đáp án đã bị hiểu nhầm là điểm bắt đầu lời giải → toàn bộ đáp án Phần II, Phần III bị cắt
mất, lời giải bị lẫn lộn be bét. Đã viết lại thuật toán: quét đúng số của từng phần (I/II/III/...),
tìm điểm số phần "quay vòng" về đúng số của phần đầu tiên — tổng quát cho bao nhiêu phần cũng đúng.

**2. Câu cuối cùng của mỗi phần bị nuốt luôn tiêu đề phần kế tiếp vào nội dung.**
`splitQuestionBlocks()` trước đây chỉ cắt nội dung 1 câu tới khi gặp "Câu N" tiếp theo, không biết
gì về ranh giới "PHẦN" — nên câu cuối của Phần I bị dính thêm cả dòng "PHẦN II. Câu trắc nghiệm
đúng sai..." vào cuối phương án D. Hậu quả kép: (a) nội dung phương án D bị rác, và (b) chữ
"đúng...sai" lẫn vào khiến câu trắc nghiệm 4 phương án bị **nhận nhầm thành đúng/sai** — đúng kiểu
lỗi lịch sử "trắc nghiệm bị nhận sai loại câu". Đã sửa: cắt block tại vị trí sớm hơn giữa (câu
tiếp theo) và (tiêu đề phần tiếp theo, nếu nó đứng trước).

**3. Nhãn phương án/ý giả (vd "...tại điểm A." cuối câu C) nuốt luôn dấu xuống dòng của nhãn thật
ngay sau.** Regex tách A–D và a–d có phần đuôi `\s*` (khoảng trắng bất kỳ, gồm cả xuống dòng) — khi
gặp 1 nhãn giả ở cuối dòng (như "điểm A." — không phải nhãn phương án thật, chỉ là chữ trong câu),
nó nuốt luôn dấu `\n` ngay sau, khiến nhãn thật ở đầu dòng kế tiếp (ví dụ "D. AC trùng BD.") mất đi
điều kiện bắt buộc "phải đứng sau khoảng trắng/xuống dòng" để được công nhận là nhãn → toàn bộ nội
dung câu D thật bị nuốt vào làm phần đuôi của câu C. Đã sửa: đổi phần đuôi từ `\s*` (mọi khoảng
trắng) sang `[ \t]*` (chỉ khoảng trắng/tab cùng dòng), không đụng đến `\n` — để dấu xuống dòng luôn
sẵn sàng cho nhãn tiếp theo.

**4 (phụ, cùng nhóm regex đáp án).** Bảng đáp án trả lời ngắn ở **vị trí cuối cùng** của vùng đáp
án (không có dòng "PHẦN..." theo sau) bị regex bỏ qua hoàn toàn vì lookahead viết sai cấu trúc
(`(?=\n\s*(?:PHẦN|PHAN|PART|$))` bắt buộc phải có `\n` đứng trước cả khi muốn khớp hết-chuỗi `$`).
Sửa thành `(?=\n\s*(?:PHẦN|PHAN|PART)|$)` để `$` là 1 nhánh độc lập, không bị ràng buộc phải có
`\n` đứng trước.

## Xác nhận bằng test thật

`tests/fullExamAssembly.test.js` verify toàn bộ 7 câu của đề mẫu 3 phần: đúng loại câu (không câu
nào rơi vào tự luận nhầm), đúng đáp án từng câu, đúng lời giải gắn với đúng câu (không lẫn giữa các
phần dù cùng đánh số "Câu 1"), và `needsReview` không bật sai. `npm test` chạy 4 bộ test — **tất cả
đều pass thật** (đã chạy, không phải chỉ khai báo).

## Vẫn cần nói rõ: đây chưa phải "chắc chắn 100% mọi đề"

Bản fix này giải quyết đúng scenario 3-phần chuẩn (là cấu trúc phổ biến nhất của đề THPT). Nhưng
đây vẫn là parser dựa trên regex/heuristic, không phải AI hiểu ngữ nghĩa — nếu file Word thật của
bạn có cách trình bày khác (ví dụ không đánh số lại "Câu 1" ở mỗi phần, dùng "Bài" thay "Câu", bảng
đáp án ở dạng bảng Word thật thay vì dòng văn bản thô, v.v.) thì vẫn có khả năng cần vá thêm — và
lần này tôi không đoán trước, mà **cần chính file Word/PDF thật của bạn để test trực tiếp**, thay vì
tiếp tục đoán cấu trúc qua text tôi tự viết. Nếu bạn gửi được file Word/PDF đề thi thật (có đáp án +
lời giải), tôi sẽ test trực tiếp trên nó và sửa đúng những gì nó thực sự gặp phải, thay vì tiếp tục
suy đoán.
