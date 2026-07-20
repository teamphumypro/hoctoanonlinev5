/*
 * SolutionDetector - tach rieng phan van ban loi giai cua tung cau (khong chi lay dap an dung nhu
 * AnswerDetector, ma lay ca doan giai thich) de dien san vao truong "loi giai/explanation" cho
 * giao vien xem lai - giao vien co the xoa/sua neu khong can.
 *
 * LUU Y GIOI HAN: day chi la van ban tho (co the con [[IMG:n]] token chua duoc thay bang anh that -
 * ImportEngine se thay the truoc khi tra ve). Khong co xu ly rieng cho bang bien thien/hinh ve phuc
 * tap trong loi giai - phan do se hien nhu trong de bai (van giu duoc vi dung chung co che [[IMG:n]]).
 */
const { romanToNumber } = require('./SectionDetector');

function detectSolutionBlocks(solutionText) {
  const bySection = {};
  const sectionHeaders = [];
  const sectionRe = /(?:^|\n)(PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\b[^\n]*/gi;
  let sm;
  while ((sm = sectionRe.exec(solutionText))) sectionHeaders.push({ number: romanToNumber(sm[2]), index: sm.index });

  const blocks = sectionHeaders.length
    ? sectionHeaders.map((s, i) => ({
        number: s.number,
        body: solutionText.slice(s.index, i + 1 < sectionHeaders.length ? sectionHeaders[i + 1].index : solutionText.length)
      }))
    : [{ number: 0, body: solutionText }];

  blocks.forEach(({ number, body }) => {
    bySection[number] = bySection[number] || {};
    const cauRe = /(?:^|\n)Câu\s*(\d{1,4})\b[.\s]*(?:\n|$)/g;
    const cauHeaders = [];
    let cm;
    while ((cm = cauRe.exec(body))) cauHeaders.push({ number: Number(cm[1]), index: cm.index, contentStart: cauRe.lastIndex });

    cauHeaders.forEach((cau, i) => {
      const blockEnd = i + 1 < cauHeaders.length ? cauHeaders[i + 1].index : body.length;
      bySection[number][cau.number] = body.slice(cau.contentStart, blockEnd).trim();
    });
  });

  return bySection;
}

module.exports = { detectSolutionBlocks };
