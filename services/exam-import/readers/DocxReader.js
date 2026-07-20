'use strict';
const { extractDocxAzota } = require('../../examImport/docxAzotaExtractor');

class DocxReader {
  supports(context) { return context.ext === '.docx'; }
  async read(context) {
    const extracted = await extractDocxAzota(context.filePath);
    return { ...extracted, source: { type: 'docx', fileName: require('path').basename(context.filePath) } };
  }
}
module.exports = DocxReader;
