/*
 * Xu ly cac placeholder/token tham chieu (khong phai noi dung that) xuat hien trong van ban
 * de thi da so hoa - vi du dang Azota: [!m:$mathtype_2$]
 *
 * QUAN TRONG: cac token nay KHONG PHAI LaTeX. Chung chi la ma tham chieu toi mot cong thuc/anh
 * duoc luu o noi khac (kho asset rieng). He thong hien tai CHUA co kho asset that su cho dang
 * token nay (no chi phat sinh khi nguoi dung go tay, dan tu Azota, hoac AI tra ve) - vi vay
 * khong the "giai ma" ra cong thuc that. Nhung du khong giai ma duoc, TUYET DOI khong duoc:
 *   - gui thang token vao KaTeX/MathJax (vi no khong phai LaTeX du co dau $)
 *   - de nguyen token hien thi tho cho hoc sinh (vd "[!m:$mathtype_2$]")
 *   - lam crash qua trinh import/luu de
 *
 * Module nay la lop bao ve cuoi cung: bat moi token con sot lai truoc khi noi dung duoc luu
 * vao CSDL hoac hien thi, va thay bang 1 canh bao ro rang, khong phai LaTeX, khong phai text
 * toan hoc gia.
 */

// Cac dang placeholder can nhan dien. Cau hinh duoc, khong hardcode 1 cu phap duy nhat (yeu cau XI.4).
const REFERENCE_PATTERNS = [
  { type: 'math', regex: /\[!m:\$([^$\]]+)\$\]/gi },          // [!m:$mathtype_2$]  (Azota)
  { type: 'image', regex: /\[!img:\$([^$\]]+)\$\]/gi },        // [!img:$image_3$]   (Azota)
  { type: 'math', regex: /\[\[MATH:([^\]]+)\]\]/gi },          // [[MATH:2]] / [[MATH:mathtype_2]]
  { type: 'math', regex: /\{\{MATH:([^}]+)\}\}/gi },           // {{MATH:2}}
  { type: 'math', regex: /\[MATH_([^\]]+)\]/gi }               // [MATH_2]
];
// Luu y: [[IMG:n]] KHONG nam trong danh sach nay vi day la token noi bo cua chinh he thong,
// luon duoc resolve thanh <img> that ngay trong pipeline (extractText.js / regexParser.js)
// truoc khi den buoc nay. [[MATH:...]] tao ra tu docxRichExtractor.js cung da duoc giai ma
// thanh <math> MathML that su ngay trong buoc do, nen neu con sot lai [[MATH:...]] toi day
// nghia la no khong resolve duoc - dung phai coi la loi, khong duoc bo qua.

/**
 * Tim tat ca reference con "song" (chua duoc resolve) trong 1 chuoi.
 * Tra ve mang { type, referenceId, rawToken }
 */
function findReferences(text) {
  const value = String(text || '');
  const found = [];
  for (const { type, regex } of REFERENCE_PATTERNS) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(value))) {
      found.push({ type, referenceId: m[1], rawToken: m[0] });
    }
  }
  return found;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Thay moi placeholder con sot lai bang 1 canh bao HTML an toan - khong bao gio de raw
 * token (vd "[!m:$mathtype_2$]") lot ra ngoai, va khong bao gio de no duoc MathJax/KaTeX
 * hieu nham la LaTeX (vi no khong con chua ky tu "$" hay dau ngoac vuong nua).
 *
 * Tra ve { text, hadMissingReferences, references } de goi noi sanitize co the
 * danh dau needsReview / warnings cho nguoi dung biet ma sua lai.
 */
function sanitizeMathReferences(text) {
  const references = findReferences(text);
  if (references.length === 0) {
    return { text: String(text || ''), hadMissingReferences: false, references: [] };
  }

  let out = String(text);
  for (const { type, regex } of REFERENCE_PATTERNS) {
    regex.lastIndex = 0;
    out = out.replace(regex, (m, refId) => {
      const label = type === 'image' ? 'hình' : 'công thức';
      const safeId = escapeHtml(refId);
      // Khong dung ky tu $, [, ] trong phan hien thi de tuyet doi khong bi MathJax/regex
      // sau nay hieu nham la LaTeX hoac token khac. Giu referenceId de admin biet phai sua cai nao.
      return `<span class="math-ref-missing" data-ref-type="${type}" data-ref-id="${safeId}" ` +
        `title="Thiếu dữ liệu ${label} (mã ${safeId}) — vui lòng chèn lại ${label} này">` +
        `⚠ [${label} bị thiếu — vui lòng chèn lại]</span>`;
    });
  }

  return { text: out, hadMissingReferences: true, references };
}

/**
 * Sanitize toan bo 1 cau hoi da parse (dung ngay truoc khi luu vao CSDL - lop bao ve cuoi cung,
 * ap dung cho ca luong regex-parser, AI-parser, lan admin go/sua tay o form review).
 */
function sanitizeQuestionPayload(row) {
  const warnings = [];
  const touch = (value, field) => {
    const { text, hadMissingReferences } = sanitizeMathReferences(value);
    if (hadMissingReferences) warnings.push(field);
    return text;
  };

  const result = { ...row };
  if (result.question != null) result.question = touch(result.question, 'question');
  if (result.explanation != null) result.explanation = touch(result.explanation, 'explanation');
  if (Array.isArray(result.options)) result.options = result.options.map((o, i) => touch(o, `option[${i}]`));
  if (Array.isArray(result.items)) {
    result.items = result.items.map((item, i) => ({
      ...item,
      content: touch(item.content, `item[${i}]`)
    }));
  }
  if (result.correct_answer != null) result.correct_answer = touch(result.correct_answer, 'correct_answer');

  return { row: result, hasMissingReferences: warnings.length > 0, warnings };
}

module.exports = { findReferences, sanitizeMathReferences, sanitizeQuestionPayload, REFERENCE_PATTERNS };
