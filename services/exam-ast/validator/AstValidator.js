'use strict';
function validate(doc){if(!doc||doc.kind!=='exam_document_ast')throw new Error('AST tài liệu không hợp lệ');if(!Array.isArray(doc.blocks))throw new Error('AST không có blocks');if(!Array.isArray(doc.questions))doc.questions=[];doc.questions.forEach((q,i)=>{q.warnings=Array.isArray(q.warnings)?q.warnings:[];if(!q.questionAst||!q.questionAst.length)q.warnings.push(`Câu ${i+1} không có nội dung AST`);});return doc;}
module.exports={validate};
