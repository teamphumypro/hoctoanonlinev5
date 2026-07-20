'use strict';

class ImportResult {
  constructor({ source = {}, rawText = '', assets = {}, sections = [], questions = [], regions = {}, warnings = [] } = {}) {
    this.version = 4;
    this.source = source;
    this.rawText = rawText;
    this.assets = {
      maths: assets.maths || {},
      images: assets.images || {},
      tables: assets.tables || {}
    };
    this.sections = Array.isArray(sections) ? sections : [];
    this.questions = Array.isArray(questions) ? questions : [];
    this.regions = regions || {};
    this.warnings = Array.isArray(warnings) ? warnings : [];
    this.stats = {
      sectionCount: this.sections.length,
      questionCount: this.questions.length,
      mathAssetCount: Object.keys(this.assets.maths).length,
      imageAssetCount: Object.keys(this.assets.images).length,
      tableAssetCount: Object.keys(this.assets.tables).length,
      questionsWithAnswer: this.questions.filter(q => hasAnswer(q.answer)).length,
      questionsWithSolution: this.questions.filter(q => String(q.rawSolution || q.explanation || '').trim()).length,
      questionsNeedingReview: this.questions.filter(q => Array.isArray(q.warnings) && q.warnings.length).length
    };
  }
}

function hasAnswer(answer) {
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== null && answer !== undefined && String(answer).trim() !== '';
}

module.exports = ImportResult;
