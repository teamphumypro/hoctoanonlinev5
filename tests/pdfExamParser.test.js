const assert = require('assert');
const { detectQuestionsOnPage, parseAnswerKeys } = require('../services/examImport/pdfExamParser');
const d = detectQuestionsOnPage('PHẦN I: trả lời từ câu 1 đến câu 12. Câu 1. A. x B. y C. z D. t Câu 2. ... PHẦN II: từ câu 1 đến câu 4. Câu 1. a) ...', 1, {title:'PHẦN I',type:'single_choice'});
assert.deepStrictEqual(d.questions.map(q=>[q.number,q.type]), [[1,'single_choice'],[2,'single_choice'],[1,'true_false']]);
const keys = parseAnswerKeys('ĐÁP ÁN THAM KHẢO Phần I Câu 1 2 3 Đáp án D B C Phần II Câu a) b) c) d) Câu 1 Đ S Đ Đ Phần III Câu 1 2 Đáp án 1856 7,35');
assert.strictEqual(keys.single[1], 'D');
assert.deepStrictEqual(keys.tf[1], ['true','false','true','true']);
assert.strictEqual(keys.short[2], '7,35');
console.log('pdfExamParser tests passed');
