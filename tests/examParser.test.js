const assert = require('assert');
const { parseExamText, splitInlineOptions, protectAssets } = require('../services/examImport/regexParser');

let r = splitInlineOptions('Nghiệm là A. [[MATH:x]] B. [[MATH:y]] C. 3 D. 4');
assert.strictEqual(r.options.length, 4);
assert.strictEqual(r.options[0].label, 'A');
assert(r.options[0].text.includes('[[MATH:x]]'));

r = splitInlineOptions('Cho điểm A. trong mặt phẳng. A. 1 B. 2 C. 3 D. 4');
assert.strictEqual(r.options.length, 4);

const sample = `PHẦN I: Chọn một phương án.\nCâu 1. Nghiệm [!m:$mathtype_2$] là\nA. [!m:$mathtype_3$]. B. [!m:$mathtype_4$]. C. 3. D. 4.\nCâu 2. Câu khác\nA. Một\nB. Hai\nC. Ba\nD. Bốn\nĐÁP ÁN THAM KHẢO\nPhần I\nCâu 1 2\nĐáp án D B\nPHẦN I\nCâu 1\nGiải chi tiết. Chọn D.\nCâu 2\nGiải câu 2.`;
const qs = parseExamText(sample, []);
assert.strictEqual(qs.length, 2);
assert.strictEqual(qs[0].type, 'single_choice');
assert.strictEqual(qs[0].options.length, 4);
assert.strictEqual(qs[0].correctIndex, 3);
assert(qs[0].explanation.includes('Giải chi tiết'));
assert.strictEqual(qs[1].correctIndex, 1);

const tf = `PHẦN II: Trong mỗi ý chọn đúng hoặc sai.\nCâu 1. Cho mệnh đề\na) Mệnh đề 1\nb) Mệnh đề 2\nc) Mệnh đề 3\nĐÁP ÁN\nPhần II\nCâu 1 Đ S Đ`;
const tq = parseExamText(tf, []);
assert.strictEqual(tq[0].type, 'true_false');
assert.strictEqual(tq[0].items.length, 3);
assert.deepStrictEqual(tq[0].items.map(x=>x.is_correct), [true,false,true]);

const p = protectAssets('x [!m:$mathtype_2$] y');
assert(!p.text.includes('mathtype_2'));
assert(p.restore(p.text).includes('[!m:$mathtype_2$]'));
console.log('examParser tests passed');
