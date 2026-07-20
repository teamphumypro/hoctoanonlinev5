/*
 * PlaceholderRenderer - lop bao ve cuoi cung: neu con sot placeholder tham chieu cong thuc dang
 * Azota (vd "[!m:$mathtype_2$]") ma chua duoc giai ma, KHONG duoc de hien tho cho hoc sinh (khong
 * phai LaTeX, khong duoc goi vao KaTeX/MathJax). Thay bang canh bao ro rang. Ban doc lap voi
 * services/examImport/mathReference.js (van giu nguyen cho Quiz.js dung, xem ghi chu o do).
 */
const REFERENCE_PATTERNS = [
  { type: 'math', regex: /\[!m:\$([^$\]]+)\$\]/gi },
  { type: 'image', regex: /\[!img:\$([^$\]]+)\$\]/gi },
  { type: 'math', regex: /\[\[MATH:([^\]]+)\]\]/gi },
  { type: 'math', regex: /\{\{MATH:([^}]+)\}\}/gi },
  { type: 'math', regex: /\[MATH_([^\]]+)\]/gi }
];

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizePlaceholders(text) {
  let out = String(text || '');
  let hadMissing = false;
  for (const { type, regex } of REFERENCE_PATTERNS) {
    regex.lastIndex = 0;
    out = out.replace(regex, (m, refId) => {
      hadMissing = true;
      const label = type === 'image' ? 'hình' : 'công thức';
      const safeId = escapeHtml(refId);
      return `<span class="math-ref-missing" data-ref-type="${type}" data-ref-id="${safeId}" title="Thiếu dữ liệu ${label} (mã ${safeId})">⚠ [${label} bị thiếu — vui lòng chèn lại]</span>`;
    });
  }
  return { text: out, hadMissingReferences: hadMissing };
}

module.exports = { sanitizePlaceholders };
