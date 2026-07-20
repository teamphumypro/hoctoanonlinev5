const assert = require('assert');
const { detectExamStructure } = require('../services/examImport/pdfAutoDetect');

// Mo phong 1 file PDF 3 trang: trang 1-2 la de bai (3 cau, 1 dung/sai), trang 3 la bang dap an.
// Day la dung kich ban thuc te: PDF khong con dieu duoc noi dung cau vao van ban giong docx nua,
// nhung pdf-parse (hoac pdf.js) van doc duoc lop chu that trong PDF text-based.
const pageTexts = [
  // Trang 1
  `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Câu 1. Nghiệm của phương trình x - 2 = 0 là
A. x = 1.
B. x = 2.
C. x = 3.
D. x = 4.
Câu 2. Cho hình lập phương. Khẳng định nào đúng?
A. AC vuông góc BD.
B. AC song song BD.`,
  // Trang 2
  `C. AC cắt BD tại điểm A.
D. AC trùng BD.

PHẦN II. Câu trắc nghiệm đúng sai.
Câu 1. Cho hàm số y = x mũ 2. Xét các mệnh đề sau
a) Đồng biến trên (0;+∞).
b) Nghịch biến trên (0;+∞).
c) Đồ thị đi qua gốc tọa độ.
d) Giá trị nhỏ nhất bằng 1.`,
  // Trang 3 - bang dap an
  `ĐÁP ÁN THAM KHẢO

PHẦN I
Câu 1 2
Đáp án B A

PHẦN II
Câu 1 Đ S Đ S`
];

const rows = detectExamStructure(pageTexts);

// 1. Phai nhan du 3 cau (khong tinh trang dap an)
assert.strictEqual(rows.length, 3, `Phải nhận đúng 3 câu (không tính bảng đáp án), thực nhận ${rows.length}: ${JSON.stringify(rows)}`);

const [c1, c2, c3] = rows;

// 2. Cau 1 nam o trang 1, la trac nghiem 4 phuong an, dap an dung la B (index 1)
assert.strictEqual(c1.page, 1, 'Câu 1 phải ở trang 1');
assert.strictEqual(c1.type, 'single_choice');
assert.strictEqual(c1.optionCount, 4);
assert.strictEqual(c1.correctIndex, 1, 'Câu 1 đáp án đúng phải là B (index 1)');
assert.strictEqual(c1.needsReview, false);

// 3. Cau 2 bat dau o trang 1 (vi "Cau 2." xuat hien o trang 1) du noi dung phuong an C/D tran sang trang 2
assert.strictEqual(c2.page, 1, 'Câu 2 được gán theo trang có dòng "Câu 2." xuất hiện, kể cả khi phương án tràn sang trang sau');
assert.strictEqual(c2.type, 'single_choice');
assert.strictEqual(c2.correctIndex, 0, 'Câu 2 Phần I đáp án đúng phải là A (index 0)');

// 4. Cau 1 cua PHAN II (trang 2) phai duoc nhan la true_false rieng biet voi Cau 1 Phan I (khong lan so)
assert.strictEqual(c3.page, 2, 'Câu 1 Phần II phải ở đúng trang 2');
assert.strictEqual(c3.type, 'true_false');
assert.strictEqual(c3.optionCount, 4);
assert.deepStrictEqual(c3.correctFlags, [true, false, true, false], 'Đáp án đúng/sai Câu 1 Phần II phải khớp đúng bảng đáp án Phần II, không lẫn với Phần I');
assert.strictEqual(c3.needsReview, false);

console.log('pdfAutoDetect tests passed');
