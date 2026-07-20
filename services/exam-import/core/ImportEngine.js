'use strict';
const ImportContext = require('./ImportContext');
const ImportResult = require('./ImportResult');
const DocxReader = require('../readers/DocxReader');
const FallbackReader = require('../readers/FallbackReader');
const StructuredExamAnalyzer = require('../analyzers/StructuredExamAnalyzer');
const ExamImportValidator = require('../validator/ExamImportValidator');

class ImportEngine {
  constructor({ readers, analyzer, validator } = {}) {
    this.readers = readers || [new DocxReader(), new FallbackReader()];
    this.analyzer = analyzer || new StructuredExamAnalyzer();
    this.validator = validator || new ExamImportValidator();
  }

  async import(filePath, options = {}) {
    const context = new ImportContext(filePath, options);
    const reader = this.readers.find(item => item.supports(context));
    if (!reader) throw new Error(`Chưa hỗ trợ định dạng ${context.ext || '(không xác định)'}`);

    const extracted = await reader.read(context);
    const analyzed = await this.analyzer.analyze(extracted, context);
    const validationWarnings = this.validator.validate(analyzed);

    return new ImportResult({
      ...analyzed,
      rawText: analyzed.rawText || extracted.rawText || '',
      assets: analyzed.assets || extracted.assets || {},
      source: extracted.source || {},
      warnings: [...context.warnings, ...validationWarnings]
    });
  }
}

module.exports = ImportEngine;
