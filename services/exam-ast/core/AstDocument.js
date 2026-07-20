'use strict';
class AstDocument {
  constructor({ source = {}, blocks = [], assets = {} } = {}) {
    this.version = '5.0';
    this.kind = 'exam_document_ast';
    this.source = source;
    this.blocks = blocks;
    this.assets = assets;
    this.sections = [];
    this.questions = [];
    this.warnings = [];
  }
}
module.exports = AstDocument;
