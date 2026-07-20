const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { findSectionHeaders } = require('../analyzers/SectionDetector');
const { findQuestionMarkers, splitExamAndSolution } = require('../analyzers/QuestionDetector');
const { splitQuestionBody } = require('../analyzers/QuestionTypeDetector');
const { detectAnswers } = require('../analyzers/AnswerDetector');
const { detectSolutionBlocks } = require('../analyzers/SolutionDetector');
const { validate } = require('../validator/Validator');

// Du lieu THAT: van ban trich xuat truc tiep tu file de thi TN THPT 2026 mon Toan (nguon
// thuvienhoclieu.com) nguoi dung da gui - khong phai du lieu tu bia.
const fullText = fs.readFileSync(path.join(__dirname, 'fixtures', 'real-exam-ma-de-103.txt'), 'utf8');
const { examText, solutionText } = splitExamAndSolution(fullText);

// 1. QuestionDetector: phai tach dung 22 cau trong de bai (khong dem nham cau trong loi giai)
const sectionHeaders = findSectionHeaders(examText);
const markers = findQuestionMarkers(examText);
assert.strictEqual(markers.length, 22, `Phải nhận đủ 22 câu trong đề bài thật, thực nhận ${markers.length}`);

// 2. AnswerDetector + SolutionDetector: phai tim dung 22/22 dap an va co van ban loi giai tuong ung
const answers = detectAnswers(solutionText);
const solutionBlocks = detectSolutionBlocks(solutionText);
let totalAnswers = 0;
Object.values(answers).forEach(sec => { totalAnswers += Object.keys(sec).length; });
assert.strictEqual(totalAnswers, 22, `Phải trích đủ 22/22 đáp án từ lời giải thật, thực nhận ${totalAnswers}`);

// 3. Lap rap toan bo (giong logic ImportEngine) va kiem tra bang Validator
const questions = markers.map((marker, i) => {
  const end = i + 1 < markers.length ? markers[i + 1].start : examText.length;
  const nextSection = sectionHeaders.find(s => s.index > marker.contentStart && s.index < end);
  const body = examText.slice(marker.contentStart, nextSection ? nextSection.index : end);
  const section = [...sectionHeaders].reverse().find(s => s.index <= marker.start);
  const sectionNo = section ? section.number : 0;
  const split = splitQuestionBody(body);
  const sectionAnswers = answers[sectionNo] || answers[0] || {};
  const rawAnswer = sectionAnswers[marker.number];

  let correctIndex = null, correctFlags = null, correctAnswerText = null;
  if (split.type === 'single_choice' && typeof rawAnswer === 'string') correctIndex = rawAnswer.charCodeAt(0) - 65;
  else if (split.type === 'true_false' && Array.isArray(rawAnswer)) correctFlags = rawAnswer;
  else if (split.type === 'short_answer' && rawAnswer != null) correctAnswerText = String(rawAnswer);

  return { section: sectionNo, number: marker.number, type: split.type, stem: split.stem, options: split.options, correctIndex, correctFlags, correctAnswerText };
});

const { questions: validated, summary } = validate(questions);
assert.strictEqual(summary.total, 22);
assert.strictEqual(summary.needsReview, 0, `Không được có câu nào cần xem lại thủ công trên đề thật này, thực tế: ${JSON.stringify(validated.filter(q => q.needsReview).map(q => q.section + '-' + q.number))}`);
assert.strictEqual(summary.byType.single_choice, 12);
assert.strictEqual(summary.byType.true_false, 4);
assert.strictEqual(summary.byType.short_answer, 6);

// 4. Doi chieu vai gia tri cu the da xac minh bang tay
const cau1 = validated.find(q => q.section === 1 && q.number === 1);
assert.strictEqual(cau1.correctIndex, 3, 'Câu 1 Phần I đáp án đúng là D (index 3)');
assert(solutionBlocks[1][1] && solutionBlocks[1][1].length > 0, 'Câu 1 Phần I phải có văn bản lời giải kèm theo (SolutionDetector)');

console.log('exam-import/analyzers tests passed (22/22 câu, 0 needsReview, trên dữ liệu đề thi thật)');
