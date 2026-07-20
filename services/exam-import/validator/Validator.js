/*
 * Validator - kiem tra tinh hop le cua ket qua da lap rap, gan co "needsReview" cho tung cau va
 * sinh bao cao tong quan de ImportEngine tra ve cho giao dien duyet.
 */
function validateQuestion(q) {
  const warnings = [];
  if (!q.stem || !q.stem.trim()) warnings.push('Thiếu nội dung câu hỏi');
  if (q.type === 'single_choice' && q.options.length < 2) warnings.push('Thiếu phương án (cần ít nhất 2)');
  if (q.type === 'true_false' && q.options.length < 2) warnings.push('Thiếu ý đúng/sai (cần ít nhất 2)');
  if (q.correctIndex == null && q.correctFlags == null && q.correctAnswerText == null) {
    warnings.push('Không tự tìm được đáp án đúng');
  }
  return { ...q, warnings, needsReview: warnings.length > 0 };
}

function validate(questions) {
  const validated = questions.map(validateQuestion);
  const summary = {
    total: validated.length,
    needsReview: validated.filter(q => q.needsReview).length,
    byType: validated.reduce((acc, q) => { acc[q.type] = (acc[q.type] || 0) + 1; return acc; }, {})
  };
  return { questions: validated, summary };
}

module.exports = { validate, validateQuestion };
