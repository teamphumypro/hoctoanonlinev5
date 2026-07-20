'use strict';
const path = require('path');

class ImportContext {
  constructor(filePath, options = {}) {
    if (!filePath) throw new Error('Thiếu đường dẫn file nhập đề');
    this.filePath = filePath;
    this.ext = path.extname(filePath).toLowerCase();
    this.options = options;
    this.startedAt = Date.now();
    this.warnings = [];
  }

  warn(code, message, details = null) {
    this.warnings.push({ code, message, details });
  }
}

module.exports = ImportContext;
