const assert = require('assert');
const { detectExamStructure, detectSolutionPages, parseAnswerKey } = require('../services/examImport/pdfAutoDetect');

// ---- 1. Khong duoc doan-ghep sai dap an tra loi ngan khi so luong token lech ----
// Truong hop that su gay loi: "Cau 1 2 / Dap an 18 56" nhung do khoang trang PDF bi tach lech,
// token bi doc thanh 3 phan ("18","5","6") thay vi 2 - TRUOC DAY se bi ghep nham thanh "1856".
const answerTextBroken = 'ĐÁP ÁN\nCâu 1 2\nĐáp án 18 5 6';
const keysBroken = parseAnswerKey(answerTextBroken);
assert.strictEqual(keysBroken[0][1], undefined, 'Không được tự đoán ghép số khi số lượng token không khớp - phải để trống, không hiện đáp án sai');
assert.strictEqual(keysBroken[0][2], undefined);

// Truong hop dung (so luong token khop chinh xac) van phai hoat dong binh thuong
const answerTextOk = 'ĐÁP ÁN\nCâu 1 2\nĐáp án 18 56';
const keysOk = parseAnswerKey(answerTextOk);
assert.strictEqual(keysOk[0][1], '18');
assert.strictEqual(keysOk[0][2], '56');

// ---- 2. Trang loi giai duoc gan dung cho tung cau, khong lan giua cac phan ----
const pageTexts = [
  `PHẦN I. Trắc nghiệm.
Câu 1. Nội dung câu 1
A. 1
B. 2
C. 3
D. 4
Câu 2. Nội dung câu 2
A. 1
B. 2
C. 3
D. 4`,
  `ĐÁP ÁN THAM KHẢO

PHẦN I
Câu 1 2
Đáp án B A`,
  `LỜI GIẢI

PHẦN I
Câu 1
Giải chi tiết câu 1 ở đây, có công thức nên không chép lại, chỉ trỏ tới trang này.
Câu 2
Giải chi tiết câu 2 ở đây.`
];

const solutionPages = detectSolutionPages(pageTexts);
assert.strictEqual(solutionPages[1][1], 3, 'Câu 1 Phần I phải có lời giải ở đúng trang 3 (trang chứa "LỜI GIẢI")');
assert.strictEqual(solutionPages[1][2], 3, 'Câu 2 Phần I phải có lời giải ở đúng trang 3');

const rows = detectExamStructure(pageTexts);
assert.strictEqual(rows.length, 2, 'Chỉ được nhận đúng 2 câu hỏi thật, không được đếm nhầm "Câu N" xuất hiện trong lời giải thành câu hỏi mới');
assert.strictEqual(rows[0].solutionPage, 3, 'Kết quả tổng hợp phải gắn đúng solutionPage cho câu 1');
assert.strictEqual(rows[0].correctIndex, 1, 'Đáp án đúng câu 1 vẫn phải là B (index 1)');
assert.strictEqual(rows[1].correctIndex, 0, 'Đáp án đúng câu 2 phải là A (index 0)');

console.log('pdfAutoDetect solutionPage + safe-short-answer tests passed');
