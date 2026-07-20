const assert = require('assert');
const { parseExamText } = require('../services/examImport/regexParser');

// Mo phong dung cau truc 1 de thi THPT thuc te: 3 phan (trac nghiem A-D, dung/sai, tra loi ngan),
// moi phan co dung so cau danh so lai tu Cau 1, bang dap an rieng tung phan, va loi giai rieng
// tung phan. Day la kich ban thuc te nhat, khong phai truong hop don gian hoa nhu cac test truoc.
const fullExam = `ĐỀ THI TỐT NGHIỆP THPT 2026 MÔN TOÁN - MÃ ĐỀ 103

PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu 3.
Câu 1. Nghiệm của phương trình x - 2 = 0 là
A. x = 1.
B. x = 2.
C. x = 3.
D. x = 4.
Câu 2. Cho hình lập phương ABCD.A'B'C'D'. Khẳng định nào sau đây đúng?
A. AC vuông góc BD.
B. AC song song BD.
C. AC cắt BD tại điểm A.
D. AC trùng BD.
Câu 3. Tập nghiệm của bất phương trình x > 1 là
A. (1; dương vô cùng).
B. (âm vô cùng; 1).
C. [1; dương vô cùng).
D. R.

PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu 2.
Câu 1. Cho hàm số y = x mũ 2. Xét các mệnh đề sau
a) Hàm số đồng biến trên khoảng (0; dương vô cùng).
b) Hàm số nghịch biến trên khoảng (0; dương vô cùng).
c) Đồ thị hàm số đi qua gốc tọa độ.
d) Hàm số có giá trị nhỏ nhất bằng 1.
Câu 2. Cho dãy số u(n) = 2n. Xét các mệnh đề sau
a) u(1) = 2.
b) u(2) = 4.
c) Dãy số là dãy giảm.
d) u(10) = 20.

PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu 2.
Câu 1. Tính giá trị của biểu thức 2 + 3.
Câu 2. Tìm x biết x mũ 2 = 16 và x > 0.

ĐÁP ÁN THAM KHẢO

PHẦN I
Câu 1 2 3
Đáp án B A A

PHẦN II
Câu 1 Đ S Đ S
Câu 2 Đ Đ S Đ

PHẦN III
Câu 1 2
Đáp án 5 4

PHẦN I
Câu 1
Giải chi tiết: x - 2 = 0 nên x = 2. Chọn B.
Câu 2
Giải chi tiết: Trong hình lập phương, AC vuông góc BD. Chọn A.
Câu 3
Giải chi tiết: x > 1 tương ứng khoảng (1; dương vô cùng). Chọn A.

PHẦN II
Câu 1
Giải chi tiết: hàm số đồng biến trên (0; dương vô cùng) nên a đúng, b sai. Đồ thị đi qua gốc tọa độ nên c đúng. Giá trị nhỏ nhất bằng 0 nên d sai.
Câu 2
Giải chi tiết: u(1)=2 đúng, u(2)=4 đúng, dãy tăng nên c sai, u(10)=20 đúng.

PHẦN III
Câu 1
Giải chi tiết: 2 + 3 = 5.
Câu 2
Giải chi tiết: x mũ 2 = 16 và x dương nên x = 4.`;

const qs = parseExamText(fullExam, []);

// 1. Phai nhan du 7 cau (3 + 2 + 2), khong roi cau nao, khong gop nham cau
assert.strictEqual(qs.length, 7, `Phải nhận đủ 7 câu, thực nhận ${qs.length}`);

const [p1c1, p1c2, p1c3, p2c1, p2c2, p3c1, p3c2] = qs;

// 2. Phan I: phai la single_choice, khong duoc roi vao essay (dung loi lich su tung gap)
[p1c1, p1c2, p1c3].forEach((q, i) => {
  assert.strictEqual(q.type, 'single_choice', `Câu ${i + 1} Phần I phải là single_choice, thực tế là ${q.type}`);
  assert.strictEqual(q.options.length, 4, `Câu ${i + 1} Phần I phải có đủ 4 phương án`);
  assert.strictEqual(q.needsReview, false, `Câu ${i + 1} Phần I không được bị đánh dấu cần kiểm tra lại`);
});
assert.strictEqual(p1c1.correctIndex, 1, 'Câu 1 Phần I đáp án đúng phải là B (index 1)');
assert.strictEqual(p1c2.correctIndex, 0, 'Câu 2 Phần I đáp án đúng phải là A (index 0)');
assert.strictEqual(p1c3.correctIndex, 0, 'Câu 3 Phần I đáp án đúng phải là A (index 0)');
assert(p1c1.explanation.includes('x = 2'), 'Lời giải Câu 1 Phần I phải đúng nội dung của chính câu 1, không lẫn câu khác');
assert(p1c3.explanation.includes('(1; dương vô cùng)'), 'Lời giải Câu 3 Phần I không được lẫn với Câu 1/2');

// 3. Phan II: phai la true_false, dung/sai tung y phai khop dung bang dap an cua PHAN II (khong lay nham dap an Phan I)
[p2c1, p2c2].forEach((q, i) => {
  assert.strictEqual(q.type, 'true_false', `Câu ${i + 1} Phần II phải là true_false, thực tế là ${q.type}`);
  assert.strictEqual(q.items.length, 4, `Câu ${i + 1} Phần II phải có đủ 4 ý a-d`);
  assert.strictEqual(q.needsReview, false, `Câu ${i + 1} Phần II không được bị đánh dấu cần kiểm tra lại`);
});
assert.deepStrictEqual(p2c1.items.map(x => x.is_correct), [true, false, true, false], 'Câu 1 Phần II: a đúng, b sai, c đúng, d sai — đúng theo bảng đáp án Phần II');
assert.deepStrictEqual(p2c2.items.map(x => x.is_correct), [true, true, false, true], 'Câu 2 Phần II: a đúng, b đúng, c sai, d đúng');
assert(p2c1.explanation.includes('đồng biến'), 'Lời giải Câu 1 Phần II phải đúng nội dung câu 1 Phần II, không lẫn với Phần I hay Phần III');
assert(p2c2.explanation.includes('u(10)'), 'Lời giải Câu 2 Phần II không được lẫn với câu khác');

// 4. Phan III: phai la short_answer, dap an so phai dung, khong bi lam tron/nham voi so cau
[p3c1, p3c2].forEach((q, i) => {
  assert.strictEqual(q.type, 'short_answer', `Câu ${i + 1} Phần III phải là short_answer, thực tế là ${q.type}`);
  assert.strictEqual(q.needsReview, false, `Câu ${i + 1} Phần III không được bị đánh dấu cần kiểm tra lại`);
});
assert.strictEqual(p3c1.correct_answer, '5', 'Câu 1 Phần III đáp án phải là 5');
assert.strictEqual(p3c2.correct_answer, '4', 'Câu 2 Phần III đáp án phải là 4');
assert(p3c1.explanation.includes('2 + 3 = 5'), 'Lời giải Câu 1 Phần III phải đúng nội dung, không lẫn với Câu 2');
assert(p3c2.explanation.includes('x = 4'), 'Lời giải Câu 2 Phần III phải đúng nội dung');

// 5. Khong duoc co cau nao roi vao essay (day chinh la loi lich su: trac nghiem bi nhan thanh tu luan)
assert.strictEqual(qs.filter(q => q.type === 'essay').length, 0, 'Không được có câu nào bị nhận nhầm thành tự luận trong đề trắc nghiệm/đúng-sai/trả lời ngắn chuẩn');

console.log('fullExamAssembly (3 phần đầy đủ đáp án + lời giải) test passed');
