/*
 * SectionDetector - cac ham dung chung: chuan hoa van ban, doi so La Ma, va tim vi tri tieu de
 * "PHAN I/II/III" trong van ban. Da kiem chung xu ly dung de 3 phan tren file de thi that.
 */
function normalizeText(input = '') {
  return String(input).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
}

function romanToNumber(value) {
  const v = String(value || '').toUpperCase();
  if (/^\d+$/.test(v)) return Number(v);
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  return map[v] || 0;
}

function findSectionHeaders(text) {
  const re = /(?:^|\n)(PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\b[^\n]*/gi;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ number: romanToNumber(m[2]), index: re.lastIndex });
  return out;
}

module.exports = { normalizeText, romanToNumber, findSectionHeaders };
