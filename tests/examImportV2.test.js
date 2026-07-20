'use strict';
const assert = require('assert');
const { buildDocument } = require('../services/examImport/azotaStructuredParser');
const raw = `PHẦN I: Chọn một phương án.
Câu 1. Tính [!m:$m1$] là
A. [!m:$m2$]. B. [!m:$m3$]. C. 3. D. 4.
PHẦN II: Chọn đúng hoặc sai.
Câu 1. Xét các phát biểu
a) Mệnh đề một.
b) Mệnh đề hai.
ĐÁP ÁN THAM KHẢO
Phần I
| Câu | 1 |
| Đáp án | B |
Phần II
| Câu | a) | b) |
| Câu 1 | Đ | S |
PHẦN I
Câu 1
Ta có [!m:$m4$]. Chọn B.
PHẦN II
Câu 1
Vậy a đúng, b sai.`;
const assets = { maths: { m1:{dataUrl:'data:image/png;base64,AA=='},m2:{dataUrl:'data:image/png;base64,AA=='},m3:{dataUrl:'data:image/png;base64,AA=='},m4:{dataUrl:'data:image/png;base64,AA=='} }, images:{} };
const doc = buildDocument(raw, assets);
assert.strictEqual(doc.questions.length, 2);
assert.strictEqual(doc.questions[0].type, 'single_choice');
assert.strictEqual(doc.questions[0].answer, 'B');
assert.ok(doc.questions[0].rawSolution.includes('Chọn B'));
assert.strictEqual(doc.questions[1].type, 'true_false');
assert.deepStrictEqual(doc.questions[1].answer, [true, false]);
assert.ok(doc.questions[1].rawSolution.includes('a đúng'));
console.log('examImportV2.test: OK');
