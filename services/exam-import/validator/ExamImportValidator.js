'use strict';

class ExamImportValidator {
  validate(document) {
    const warnings = [];
    if (!document.rawText || document.rawText.trim().length < 20) {
      throw new Error('Không đọc được nội dung tài liệu hoặc tài liệu quá ngắn');
    }
    if (!Array.isArray(document.questions) || document.questions.length === 0) {
      warnings.push({ code: 'NO_QUESTIONS', message: 'Chưa tự động nhận diện được câu hỏi. Hãy kiểm tra nội dung nguồn ở màn hình review.' });
    }
    for (const [index, question] of (document.questions || []).entries()) {
      question.warnings = Array.isArray(question.warnings) ? question.warnings : [];
      if (!String(question.rawQuestion || question.question || '').trim()) question.warnings.push('Câu hỏi trống');
      if (question.type === 'single_choice' && (!Array.isArray(question.rawOptions) || question.rawOptions.length < 2)) question.warnings.push('Thiếu phương án lựa chọn');
      if (question.number == null) question.number = index + 1;
    }
    return warnings;
  }
}
module.exports = ExamImportValidator;
