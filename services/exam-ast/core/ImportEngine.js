'use strict';
const path=require('path');const Docx=require('../readers/DocxAstReader');const Analyzer=require('../analyzers/QuestionAstAnalyzer');const Validator=require('../validator/AstValidator');
async function importExam(filePath){const ext=path.extname(filePath).toLowerCase();if(ext!=='.docx')throw new Error('Import Engine AST V5 hiện nhận file DOCX.');const doc=await Docx.read(filePath);Analyzer.analyze(doc);Validator.validate(doc);return doc;}
module.exports={importExam};
