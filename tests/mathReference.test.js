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

// 5. Placeholder trong phuong an A-D khong lam vo cau truc, van bi thay the dung tung phuong an
const { splitInlineOptions } = require('../services/examImport/regexParser');
const split = splitInlineOptions('A. [!m:$mathtype_3$]. B. [!m:$mathtype_4$]. C. 3. D. 4.');
assert.strictEqual(split.options.length, 4, 'A-D phai van tach dung 4 phuong an du co placeholder Azota');
const sanitizedOptA = sanitizeMathReferences(split.options[0].text);
assert(!sanitizedOptA.text.includes('[!m:$mathtype_3$]'));

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
