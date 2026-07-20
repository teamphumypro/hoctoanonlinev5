/*
 * AnswerDetector - tim dap an dung, ket hop 2 chien luoc (uu tien chien luoc 1, chi dung chien
 * luoc 2 khi khong tim thay):
 *
 * 1. Dap an nam LONG TRONG loi giai (da kiem chung tren file de thi that, khop 22/22 cau):
 *      "...Chọn D. [[IMG:n]]."          -> trac nghiem
 *      "Đáp án câu 1: Đ, S, Đ, Đ."       -> dung/sai
 *      "Đáp án: 1856."                   -> tra loi ngan
 * 2. Bang dap an rieng truyen thong (dang "Câu 1 2 3 / Đáp án B A A") - cho de khong dung kieu 1.
 */
const { findSectionHeaders, romanToNumber, normalizeText } = require('./SectionDetector');

function extractAnswerFromSolutionBlock(block) {
  let m = /Chọn\s+([A-H])\b/.exec(block);
  if (m) return m[1];

  m = /Đáp\s*án\s*câu\s*\d+\s*:\s*([ĐS](?:\s*,\s*[ĐS])+)/i.exec(block);
  if (m) return m[1].split(',').map(s => s.trim().toUpperCase() === 'Đ');

  m = /Đáp\s*án\s*:\s*([^\n]+?)\.?\s*$/im.exec(block);
  if (m) return m[1].trim();

  return null;
}

function detectAnswersFromSolutionText(rawText) {
  const text = normalizeText(rawText);
  const bySection = {};

  const sectionHeaders = [];
  const sectionRe = /(?:^|\n)(PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\b[^\n]*/gi;
  let sm;
  while ((sm = sectionRe.exec(text))) sectionHeaders.push({ number: romanToNumber(sm[2]), index: sm.index });

  const blocks = sectionHeaders.length
    ? sectionHeaders.map((s, i) => ({
        number: s.number,
        body: text.slice(s.index, i + 1 < sectionHeaders.length ? sectionHeaders[i + 1].index : text.length)
      }))
    : [{ number: 0, body: text }];

  blocks.forEach(({ number, body }) => {
    bySection[number] = bySection[number] || {};
    const cauRe = /(?:^|\n)Câu\s*(\d{1,4})\b[.\s]*(?:\n|$)/g;
    const cauHeaders = [];
    let cm;
    while ((cm = cauRe.exec(body))) cauHeaders.push({ number: Number(cm[1]), index: cm.index, contentStart: cauRe.lastIndex });

    cauHeaders.forEach((cau, i) => {
      const blockEnd = i + 1 < cauHeaders.length ? cauHeaders[i + 1].index : body.length;
      const block = body.slice(cau.contentStart, blockEnd);
      const answer = extractAnswerFromSolutionBlock(block);
      if (answer != null && bySection[number][cau.number] == null) bySection[number][cau.number] = answer;
    });
  });

  return bySection;
}

function normalizeTrueFalseToken(v) {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'Đ' || s === 'DUNG' || s === 'ĐÚNG') return true;
  if (s === 'S' || s === 'SAI') return false;
  return s;
}

function detectAnswersFromAnswerTable(answerText) {
  const bySection = {};
  if (!answerText) return bySection;

  const headers = findSectionHeaders(answerText);
  const sections = headers.length ? headers : [{ index: 0, number: 0 }];

  sections.forEach((s, idx) => {
    const chunk = answerText.slice(s.index, idx + 1 < sections.length ? sections[idx + 1].index : answerText.length);
    const key = bySection[s.number] || (bySection[s.number] = {});

    let x;
    const direct = /(?:Câu\s*)?(\d{1,4})\s*[:.\-) ]+\s*([A-HĐDS])\b/gi;
    while ((x = direct.exec(chunk))) key[Number(x[1])] = normalizeTrueFalseToken(x[2]);

    const table = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+((?:[A-HĐDS]\s*){2,})/i.exec(chunk);
    if (table) {
      const nums = (table[1].match(/\d+/g) || []).map(Number);
      const vals = table[2].match(/(?:Đ|D|S|[A-H])/gi) || [];
      nums.forEach((n, i) => { if (vals[i]) key[n] = normalizeTrueFalseToken(vals[i]); });
    }

    const tf = /Câu\s*(\d{1,4})\s+((?:(?:Đ|D|S)\s*){2,})/gi;
    while ((x = tf.exec(chunk))) key[Number(x[1])] = (x[2].match(/Đ|D|S/gi) || []).map(v => /Đ|D/i.test(v));

    const short = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+([\s\S]+?)(?=\n\s*(?:PHẦN|PHAN|PART)|$)/i.exec(chunk);
    if (short) {
      const nums = short[1].match(/\d+/g).map(Number);
      const vals = short[2].trim().split(/\s+/).filter(Boolean);
      // Khong doan-ghep token khi so luong lech - tha de trong (needsReview) con hon hien dap an sai.
      if (vals.length === nums.length) nums.forEach((n, i) => { if (vals[i] && key[n] == null) key[n] = vals[i]; });
    }
  });
  return bySection;
}

/** Ket hop ca 2 chien luoc THEO TUNG PHAN rieng biet: neu 1 Phan da co dap an tu loi giai (chien
 * luoc chinh, tin cay hon), KHONG dung bang dap an du phong cho DUNG PHAN do nua - tranh no bat
 * nham so trong van xuoi loi giai thanh dap an gia (da phat hien qua thuc te tren file that: bang
 * dap an du phong tung bat nham "1856" trong loi giai thanh mot "cau so 1856"). Phan nao chua co
 * dap an nao tu loi giai thi moi dung bang dap an rieng lam du phong cho dung phan do. */
function detectAnswers(solutionText) {
  const fromSolution = detectAnswersFromSolutionText(solutionText);
  const fromTable = detectAnswersFromAnswerTable(solutionText);

  const merged = {};
  const allSections = new Set([...Object.keys(fromSolution), ...Object.keys(fromTable)].map(Number));
  allSections.forEach(sec => {
    const solutionAnswersForSection = fromSolution[sec] || {};
    merged[sec] = Object.keys(solutionAnswersForSection).length > 0
      ? solutionAnswersForSection
      : (fromTable[sec] || {});
  });
  return merged;
}

module.exports = { detectAnswers, detectAnswersFromSolutionText, detectAnswersFromAnswerTable, extractAnswerFromSolutionBlock };
