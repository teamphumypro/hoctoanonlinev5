/*
 * QuestionDetector - tim vi tri tung "Cau N" trong phan de bai, va tim ranh gioi giua de bai va
 * vung dap an/loi giai (dua vao tieu de "DAP AN THAM KHAO"...). Da kiem chung tren file that:
 * cat dung ranh gioi de tranh dem nham "Cau N" trong loi giai thanh cau hoi moi.
 */
function findQuestionMarkers(text) {
  const re = /(?:^|\n)Câu\s*(\d{1,4})\.\s*/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ number: Number(m[1]), start: m.index, contentStart: re.lastIndex });
  return out;
}

function splitExamAndSolution(fullText) {
  const answerHeadingRe = /(?:^|\n)\s*(?:ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN|ANSWER\s*KEY)\b/i;
  const m = answerHeadingRe.exec(fullText);
  if (!m) return { examText: fullText, solutionText: '' };
  return { examText: fullText.slice(0, m.index), solutionText: fullText.slice(m.index) };
}

module.exports = { findQuestionMarkers, splitExamAndSolution };
