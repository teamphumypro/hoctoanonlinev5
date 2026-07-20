const assert = require('assert');
const path = require('path');

// Test tich hop DAY DU dung dung file .docx THAT (khong phai van ban da trich san) qua
// ExamImportEngine.import() - can jszip/fast-xml-parser/sharp that su duoc cai (npm install),
// nen se TU BO QUA neu chay trong moi truong chua cai du (vd sandbox phat trien khong co mang) -
// khong lam vo npm test o do, nhung SE chay that khi trien khai that (co npm install day du).
(async () => {
  let ExamImportEngine;
  try {
    ExamImportEngine = require('../core/ImportEngine');
    require.resolve('jszip');
    require.resolve('fast-xml-parser');
  } catch (err) {
    console.log('ImportEngine integration test BO QUA (thieu jszip/fast-xml-parser trong moi truong nay - se chay that sau khi npm install). Ly do:', err.message);
    return;
  }

  const fixturePath = path.join(__dirname, 'fixtures', 'real-exam-ma-de-103.docx');
  const exam = await ExamImportEngine.import(fixturePath);

  assert.strictEqual(exam.questions.length, 22, `Phải nhận đủ 22 câu từ file .docx thật, thực nhận ${exam.questions.length}`);
  assert.strictEqual(exam.summary.needsReview, 0, 'Không được có câu nào cần xem lại thủ công trên đề thật này');
  assert.strictEqual(exam.summary.byType.single_choice, 12);
  assert.strictEqual(exam.summary.byType.true_false, 4);
  assert.strictEqual(exam.summary.byType.short_answer, 6);
  assert(exam.assets.length > 0, 'Phải trích được ít nhất 1 ảnh/công thức từ file thật');

  const cau1 = exam.questions.find(q => q.section === 1 && q.number === 1);
  assert.strictEqual(cau1.correctIndex, 3, 'Câu 1 Phần I đáp án đúng là D (index 3)');
  assert(cau1.stem.includes('<img'), 'Thân câu 1 phải chứa ảnh công thức đã dựng lại (thẻ <img>), không phải token [[IMG:n]] còn sót');

  console.log('ImportEngine integration test passed (chạy đầy đủ trên file .docx thật, 22/22 câu, có ảnh công thức thật)');
})().catch(err => {
  console.error('ImportEngine integration test THAT BAI:', err);
  process.exit(1);
});
