const assert = require('assert');
const path = process.env.TEST_DOCX_PATH;
const { extractDocxRich } = require('../services/examImport/docxRichExtractor');

(async () => {
  if (!path) {
    console.log('docxMathExtractor test skipped: set TEST_DOCX_PATH to run it');
    return;
  }
  const result = await extractDocxRich(path);
  assert(result.images.length > 0, 'Expected embedded images/math assets');
  assert(!result.text.includes('[công thức - chưa hiển thị được'), 'MathType conversion still failed');
  assert(/A\.\s*\[\[IMG:\d+\]\].*B\.\s*\[\[IMG:\d+\]\]/s.test(result.text), 'Inline A/B options with math were not preserved');
  console.log('docxMathExtractor test passed');
})().catch(err => { console.error(err); process.exit(1); });
