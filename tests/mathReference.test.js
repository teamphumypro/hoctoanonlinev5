const assert = require('assert');
const { findReferences, sanitizeMathReferences, sanitizeQuestionPayload } = require('../services/examImport/mathReference');

// 1. Nhan dien dung dang token kieu Azota
let refs = findReferences('Nghiệm của [!m:$mathtype_2$] là');
assert.strictEqual(refs.length, 1);
assert.strictEqual(refs[0].type, 'math');
assert.strictEqual(refs[0].referenceId, 'mathtype_2');

// 2. Sanitize khong duoc de sot raw token
let r = sanitizeMathReferences('Nghiệm của [!m:$mathtype_2$] là');
assert(!r.text.includes('[!m:$mathtype_2$]'), 'Raw placeholder van con sot lai - vi pham yeu cau khong hien tho cho hoc sinh');
assert(!r.text.includes('$'), 'Khong duoc con dau $ - de tranh MathJax hieu nham la LaTeX');
assert(r.hadMissingReferences === true);
assert(r.text.includes('mathtype_2'), 'Van phai giu duoc referenceId de admin biet cai nao can chen lai');

// 3. Nhieu dang placeholder khac nhau deu duoc nhan dien (khong hardcode 1 cu phap)
const variants = [
  '[!m:$mathtype_5$]',
  '[[MATH:mathtype_5]]',
  '{{MATH:5}}',
  '[MATH_5]',
  '[!img:$image_3$]'
];
variants.forEach(v => {
  const out = sanitizeMathReferences(v);
  assert(out.hadMissingReferences, `Khong nhan dien duoc dang placeholder: ${v}`);
  assert(!out.text.includes(v), `Con sot raw token cho dang: ${v}`);
});

// 4. Khong dung cham vao noi dung binh thuong / cong thuc da resolve that (MathML) / anh da resolve
const safe = 'Cho hàm số y = <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math> và <img src="data:image/png;base64,abc">';
const safeResult = sanitizeMathReferences(safe);
assert.strictEqual(safeResult.hadMissingReferences, false);
assert.strictEqual(safeResult.text, safe);

// 5. Placeholder xuat hien trong 1 chuoi dang phuong an van duoc sanitize dung, khong con phu
// thuoc vao bo tach A-D cua pipeline nhap de cu (da bo - xem services/exam-import/analyzers/QuestionTypeDetector.js
// cho cach lam moi, khong con tai tao noi dung cau/phuong an nua).
const optionLikeText = 'B. [!m:$mathtype_4$]';
const sanitizedOptB = sanitizeMathReferences(optionLikeText);
assert(!sanitizedOptB.text.includes('[!m:$mathtype_4$]'), 'Placeholder trong noi dung dang phuong an van phai duoc sanitize');
assert(sanitizedOptB.hadMissingReferences === true);

// 6. sanitizeQuestionPayload danh dau needsReview/canh bao dung field, va sanitize dung ca options + explanation
const payload = sanitizeQuestionPayload({
  question: 'Tính [!m:$mathtype_1$]',
  options: ['A đúng', 'B [!m:$mathtype_2$]', 'C', 'D'],
  correctIndex: 0,
  explanation: 'Ta có [!m:$mathtype_9$] nên chọn A'
});
assert(payload.hasMissingReferences === true);
assert(payload.warnings.includes('question'));
assert(payload.warnings.includes('option[1]'));
assert(payload.warnings.includes('explanation'));
assert(!JSON.stringify(payload.row).includes('[!m:$mathtype_1$]'));
assert(!JSON.stringify(payload.row).includes('[!m:$mathtype_2$]'));
assert(!JSON.stringify(payload.row).includes('[!m:$mathtype_9$]'));

console.log('mathReference tests passed');
