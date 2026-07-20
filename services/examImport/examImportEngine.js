'use strict';
const path = require('path');
const { extractDocxAzota } = require('./docxAzotaExtractor');
const { buildDocument } = require('./azotaStructuredParser');
const { extractText } = require('./extractText');

async function importExam(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const extracted = await extractDocxAzota(filePath);
    return buildDocument(extracted.rawText, extracted.assets);
  }
  const fallback = await extractText(filePath);
  return buildDocument(fallback.text || '', { maths: {}, images: Object.fromEntries((fallback.images || []).map((dataUrl, i) => [`img_${i + 1}`, { id: `img_${i + 1}`, dataUrl }])) });
}
module.exports = { importExam };
