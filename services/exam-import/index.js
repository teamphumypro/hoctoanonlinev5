'use strict';
const ImportEngine = require('./core/ImportEngine');
const engine = new ImportEngine();

async function importExam(filePath, options) {
  return engine.import(filePath, options);
}

module.exports = { ImportEngine, importExam, engine };
