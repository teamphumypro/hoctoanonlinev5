'use strict';
const { buildDocument } = require('../../examImport/azotaStructuredParser');

class StructuredExamAnalyzer {
  analyze(extracted) {
    return buildDocument(extracted.rawText || '', extracted.assets || {});
  }
}
module.exports = StructuredExamAnalyzer;
