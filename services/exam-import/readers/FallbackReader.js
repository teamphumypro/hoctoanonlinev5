'use strict';
const path = require('path');

class FallbackReader {
  supports() { return true; }
  async read(context) {
    const { extractText } = require('../../examImport/extractText');
    const fallback = await extractText(context.filePath);
    const images = Object.fromEntries((fallback.images || []).map((dataUrl, i) => [`img_${i + 1}`, { id: `img_${i + 1}`, dataUrl }]));
    return {
      rawText: fallback.text || '',
      assets: { maths: {}, images, tables: {} },
      source: { type: context.ext.replace('.', '') || 'unknown', fileName: path.basename(context.filePath) }
    };
  }
}
module.exports = FallbackReader;
