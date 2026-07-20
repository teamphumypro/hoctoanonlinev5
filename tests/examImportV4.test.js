'use strict';
const assert = require('assert');
const ImportEngine = require('../services/exam-import/core/ImportEngine');
const ImportResult = require('../services/exam-import/core/ImportResult');

class FakeReader {
  supports() { return true; }
  async read() {
    return {
      rawText: 'PHẦN I: Chọn một phương án.\nCâu 1. Tính 1 + 1.\nA. 1 B. 2 C. 3 D. 4\nĐÁP ÁN\nPhần I\n| Câu | 1 |\n| Đáp án | B |',
      assets: { maths: {}, images: {}, tables: {} },
      source: { type: 'fake', fileName: 'test.docx' }
    };
  }
}

(async () => {
  const engine = new ImportEngine({ readers: [new FakeReader()] });
  const result = await engine.import('/tmp/test.docx');
  assert.ok(result instanceof ImportResult);
  assert.strictEqual(result.version, 4);
  assert.strictEqual(result.questions.length, 1);
  assert.strictEqual(result.questions[0].answer, 'B');
  assert.strictEqual(result.stats.questionsWithAnswer, 1);
  assert.strictEqual(result.source.type, 'fake');
  console.log('examImportV4.test: OK');
})().catch(error => { console.error(error); process.exit(1); });
