# AZOTA Import Engine Rebuild V2

Bản này sửa ba lỗi còn lại của V1:

1. MathType WMF/EMF được chuyển thật sang PNG trên Node.js bằng FileReader polyfill đầy đủ (`readAsDataURL`), không còn nhúng `data:image/wmf` mà trình duyệt không hiển thị.
2. Bộ đọc bảng đáp án nhận bảng Word dạng markdown động cho trắc nghiệm, đúng/sai và trả lời ngắn; không khóa số phần hoặc số câu.
3. Bộ tách vùng đáp án/lời giải xác định lần xuất hiện thứ hai của `PHẦN ... / Câu 1`, sau các bảng đáp án, rồi gắn lời giải theo `section + question number`.

Kiểm thử trực tiếp với file mẫu bất kỳ đã cung cấp:
- 363 công thức chuyển thành PNG hợp lệ.
- 5 hình minh họa.
- 22/22 câu có đáp án được nhận.
- 22/22 câu có hướng dẫn giải được gắn đúng.
- Phần I: 12 câu trắc nghiệm.
- Phần II: 4 câu đúng/sai.
- Phần III: 6 câu trả lời ngắn.

File mẫu chỉ dùng để kiểm thử; parser không hardcode các số lượng trên.
