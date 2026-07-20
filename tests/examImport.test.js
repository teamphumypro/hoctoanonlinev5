const assert=require('assert');
const {buildDocument,splitOptions}=require('../services/examImport/azotaStructuredParser');
let p=splitOptions('Nội dung [!m:$mathtype_1$] là\nA. [!m:$mathtype_2$]  B. 2  C. 3  D. 4');
assert.strictEqual(p.options.length,4);assert.ok(p.stem.includes('mathtype_1'));
const d=buildDocument('PHẦN I: Chọn đáp án\nCâu 1. Nội dung\nA. 1  B. 2  C. 3  D. 4\nĐÁP ÁN\nPhần I\n| Câu | 1 |\n| Đáp án | B |',{});
assert.strictEqual(d.questions.length,1);assert.strictEqual(d.questions[0].type,'single_choice');assert.strictEqual(d.questions[0].answer,'B');
console.log('examImport tests passed');
