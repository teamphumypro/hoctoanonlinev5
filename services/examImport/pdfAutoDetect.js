/*
 * Tu dong nhan dien cau truc de thi tu file PDF - PHIEN BAN MOI, thay the hoan toan cach lam cu
 * (doc-hieu va tach lai noi dung tung cau/phuong an/cong thuc, roi luu ban sao noi dung do).
 *
 * TRIET LY KHAC BIET: khong con co gang "hieu va tai tao lai" noi dung cau hoi nua. Trang PDF goc
 * duoc hien thi nguyen ven cho hoc sinh xem (qua pdf.js o trinh duyet, xem views/quiz-take-pdf.ejs)
 * - vi vay khong con rui ro mat/meo cong thuc, hinh, bang nhu cach cu (KHONG con OMML/WMF/placeholder
 * gi ca). Cai duy nhat can tu dong nhan dien la METADATA nhe: cau N nam o TRANG nao, co may phuong an,
 * va dap an dung la gi - de sinh ra o nhap lieu ben canh trang sach dung dang cau hoi. Giao vien xem
 * lai va sua tay trong man hinh duyet truoc khi luu (services khong tu quyet dinh 1 minh).
 *
 * Phan da duoc giu lai tu regexParser.js cu (vi da test ky, on dinh, khong lien quan lỗi meo noi
 * dung): dò ranh gioi "Phan I/II/III", bang dap an (moi dang: hang ngang, Cau N chu cai, dung/sai,
 * tra loi ngan).
 */

function normalizeText(input = '') {
  return String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function romanToNumber(value) {
  const v = String(value || '').toUpperCase();
  if (/^\d+$/.test(v)) return Number(v);
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  return map[v] || 0;
}

function findSectionHeaders(text) {
  const re = /(?:^|\n)\s*(?:PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\b/gi;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ index: m.index, number: romanToNumber(m[1]) });
  return out;
}

function findQuestionMarkers(text) {
  const re = /(?:^|\n)\s*(?:Câu|Cau|Bài|Bai|Question|Problem)\s*(\d{1,4})(?:\s*[.:)]\s*|\s*(?=\n))/gi;
  const markers = [];
  let m;
  while ((m = re.exec(text))) markers.push({ start: m.index, contentStart: re.lastIndex, number: Number(m[1]) });
  return markers;
}

// Dem chuoi nhan tang dan lien tiep dai nhat (A,B,C,D... hoac a,b,c,d...) trong 1 doan text -
// CHI DE DOAN LOAI CAU (co bao nhieu phuong an), KHONG dung de cat noi dung ra (khac voi cach cu).
function longestIncreasingLabelRun(text, upperCase) {
  const cls = upperCase ? 'A-H' : 'a-h';
  const re = new RegExp('(?:^|[\\n\\t ]{1,})([' + cls + '])\\s*[.)][ \\t]*', 'g');
  const labels = [];
  let m;
  while ((m = re.exec(text))) labels.push(m[1]);
  let best = 0;
  for (let i = 0; i < labels.length; i++) {
    let len = 1;
    let expected = labels[i].charCodeAt(0) + 1;
    for (let j = i + 1; j < labels.length; j++) {
      const code = labels[j].charCodeAt(0);
      if (code === expected) { len++; expected++; }
      else if (code > expected) break;
    }
    if (len > best) best = len;
  }
  return best;
}

function guessQuestionType(snippet) {
  const optionRun = longestIncreasingLabelRun(snippet, true);
  if (optionRun >= 2) return { type: 'single_choice', optionCount: Math.min(optionRun, 8) };
  const tfRun = longestIncreasingLabelRun(snippet, false);
  if (tfRun >= 2) return { type: 'true_false', optionCount: Math.min(tfRun, 8) };
  return { type: 'short_answer', optionCount: 0 };
}

// Voi moi trang PDF, tim cac "Cau N" xuat hien tren trang do va gan dung so Phan (I/II/III) dang
// hieu luc tai vi tri do (khong chi lay 1 so Phan cho ca trang, vi 1 trang co the vua ket thuc
// Phan nay vua bat dau Phan khac).
function detectQuestionsPerPage(pageTexts) {
  let currentSection = 0;
  const rows = [];
  pageTexts.forEach((pageText, pageIdx) => {
    const markers = findQuestionMarkers(pageText);
    markers.forEach((marker, i) => {
      const localHeaders = findSectionHeaders(pageText.slice(0, marker.start));
      if (localHeaders.length) currentSection = localHeaders[localHeaders.length - 1].number;

      const end = i + 1 < markers.length ? markers[i + 1].start : pageText.length;
      const snippet = pageText.slice(marker.contentStart, end);
      const guess = guessQuestionType(snippet);

      rows.push({
        section: currentSection,
        number: marker.number,
        page: pageIdx + 1, // 1-based, khop voi so trang pdf.js hien thi cho giao vien/hoc sinh
        type: guess.type,
        optionCount: guess.optionCount
      });
    });
  });
  return rows;
}

// Tach vung "bang dap an" (+ loi giai neu co) ra khoi phan de bai - dung chung logic da test ky
// truoc day de xu ly dung ca truong hop de co 3 phan (I/II/III) lap lai ca o dap an lan loi giai.
function splitAnswerAndSolution(raw) {
  const answerHeading = /(?:^|\n)\s*(?:ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN|ANSWER\s*KEY)\b/i;
  const m = answerHeading.exec(raw);
  if (!m) return { answerText: '', solutionText: '' };
  const tail = raw.slice(m.index).trim();

  const explicitSolution = /(?:^|\n)\s*(?:LỜI\s*GIẢI(?:\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI|SOLUTION|EXPLANATION)\b/i.exec(tail);
  let solutionIndex = explicitSolution ? explicitSolution.index : -1;

  if (solutionIndex < 0) {
    const occurrences = findSectionHeaders(tail);
    if (occurrences.length) {
      const firstNumber = occurrences[0].number;
      const restartAt = occurrences.findIndex((o, i) => i > 0 && o.number === firstNumber);
      if (restartAt > 0) solutionIndex = occurrences[restartAt].index;
    }
  }

  if (solutionIndex >= 0) {
    return { answerText: tail.slice(0, solutionIndex).trim(), solutionText: tail.slice(solutionIndex).trim() };
  }
  return { answerText: tail, solutionText: '' };
}

function normalizeAnswer(v) {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'Đ' || s === 'DUNG' || s === 'ĐÚNG') return true;
  if (s === 'S' || s === 'SAI') return false;
  return s;
}

// Da duoc test ky o ban truoc (tests/fullExamAssembly.test.js) - giu nguyen logic, chi doi ten file.
function parseAnswerKey(answerText) {
  const bySection = {};
  if (!answerText) return bySection;

  const headers = findSectionHeaders(answerText);
  const sections = headers.length ? headers : [{ index: 0, number: 0 }];

  sections.forEach((s, idx) => {
    const chunk = answerText.slice(s.index, idx + 1 < sections.length ? sections[idx + 1].index : answerText.length);
    const key = bySection[s.number] || (bySection[s.number] = {});

    let x;
    const direct = /(?:Câu\s*)?(\d{1,4})\s*[:.\-) ]+\s*([A-HĐDS])\b/gi;
    while ((x = direct.exec(chunk))) key[Number(x[1])] = normalizeAnswer(x[2]);

    const table = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+((?:[A-HĐDS]\s*){2,})/i.exec(chunk);
    if (table) {
      const nums = (table[1].match(/\d+/g) || []).map(Number);
      const vals = table[2].match(/(?:Đ|D|S|[A-H])/gi) || [];
      nums.forEach((n, i) => { if (vals[i]) key[n] = normalizeAnswer(vals[i]); });
    }

    const tf = /Câu\s*(\d{1,4})\s+((?:(?:Đ|D|S)\s*){2,})/gi;
    while ((x = tf.exec(chunk))) {
      key[Number(x[1])] = (x[2].match(/Đ|D|S/gi) || []).map(v => /Đ|D/i.test(v));
    }

    const short = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+([\s\S]+?)(?=\n\s*(?:PHẦN|PHAN|PART)|$)/i.exec(chunk);
    if (short) {
      const nums = short[1].match(/\d+/g).map(Number);
      let vals = short[2].trim().split(/\s+/).filter(Boolean);
      while (vals.length > nums.length && vals.length > 1) {
        const i = vals.findIndex((v, j) => j + 1 < vals.length && /^\d+$/.test(v) && /^\d$/.test(vals[j + 1]));
        if (i < 0) break;
        vals.splice(i, 2, vals[i] + vals[i + 1]);
      }
      nums.forEach((n, i) => { if (vals[i] && key[n] == null) key[n] = vals[i]; });
    }
  });
  return bySection;
}

/**
 * Ham chinh: nhan mang van ban tung trang PDF (pageTexts[i] = chu cua trang i+1), tra ve danh sach
 * cau hoi da nhan dien voi day du metadata nhe (khong co noi dung cau - noi dung la chinh trang PDF).
 */
function detectExamStructure(pageTexts) {
  const normalizedPages = pageTexts.map(t => normalizeText(t || ''));
  const fullText = normalizedPages.join('\n\n');
  const { answerText } = splitAnswerAndSolution(fullText);
  const answers = parseAnswerKey(answerText);
  const pageQuestions = detectQuestionsPerPage(normalizedPages);

  return pageQuestions.map(pq => {
    const sectionAnswers = answers[pq.section] || answers[0] || {};
    const answer = sectionAnswers[pq.number];
    let correctIndex = null;
    let correctFlags = null;
    let correctAnswerText = null;

    if (pq.type === 'single_choice' && typeof answer === 'string' && /^[A-H]$/.test(answer)) {
      correctIndex = answer.charCodeAt(0) - 65;
    } else if (pq.type === 'true_false' && Array.isArray(answer)) {
      correctFlags = answer;
    } else if (pq.type === 'short_answer' && answer != null && !Array.isArray(answer)) {
      correctAnswerText = String(answer);
    }

    return {
      section: pq.section,
      number: pq.number,
      page: pq.page,
      type: pq.type,
      optionCount: pq.optionCount,
      correctIndex,
      correctFlags,
      correctAnswerText,
      needsReview: correctIndex == null && correctFlags == null && correctAnswerText == null
    };
  });
}

module.exports = {
  detectExamStructure,
  detectQuestionsPerPage,
  parseAnswerKey,
  splitAnswerAndSolution,
  normalizeText,
  guessQuestionType,
  longestIncreasingLabelRun
};
