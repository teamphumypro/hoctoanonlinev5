const fs = require('fs');
const pdfParse = require('pdf-parse');

function cleanText(s) {
  return String(s || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function sectionType(label) {
  const x = String(label || '').toUpperCase();
  if (/PHẦN\s*II\b|PHAN\s*II\b/.test(x)) return 'true_false';
  if (/PHẦN\s*III\b|PHAN\s*III\b/.test(x)) return 'short_answer';
  if (/PHẦN\s*IV\b|PHAN\s*IV\b|TỰ\s*LUẬN|TU\s*LUAN/.test(x)) return 'essay';
  return 'single_choice';
}

function detectSection(text, current) {
  const matches = [...String(text || '').matchAll(/PH(?:Ầ|A)N\s+(I{1,4}|V)\b[^\n]*/gi)];
  if (!matches.length) return current;
  const last = matches[matches.length - 1][0];
  return { title: cleanText(last), type: sectionType(last) };
}

function detectQuestionsOnPage(text, pageNumber, initialSection) {
  const events = [];
  for (const m of String(text || '').matchAll(/PH(?:Ầ|A)N\s+(I{1,4}|V)\b/gi)) {
    const title = `PHẦN ${String(m[1]).toUpperCase()}`;
    events.push({ kind: 'section', index: m.index, value: { title, type: sectionType(title) } });
  }
  for (const m of String(text || '').matchAll(/(?:Câu|Cau|Bài|Bai|Question|Problem)\s*(\d{1,3})\s*[\.:\)]/gi)) {
    const before = String(text || '').slice(Math.max(0, m.index - 28), m.index).toLowerCase();
    if (/từ\s*$|đến\s*$|tu\s*$|den\s*$/.test(before)) continue;
    events.push({ kind: 'question', index: m.index, number: Number(m[1]) });
  }
  events.sort((a,b) => a.index-b.index);
  let section = initialSection;
  const found = [];
  for (const event of events) {
    if (event.kind === 'section') { section = event.value; continue; }
    found.push({
      number: event.number,
      displayNumber: String(event.number),
      page: pageNumber,
      type: section.type,
      sectionTitle: section.title,
      points: section.type === 'true_false' ? 1 : section.type === 'essay' ? 1 : 0.25,
      optionCount: section.type === 'single_choice' ? 4 : section.type === 'true_false' ? 4 : 0,
      answer: '',
      confidence: 0.86
    });
  }
  return { questions: found, finalSection: section };
}

function sliceBetween(text, startRe, endRe) {
  const start = text.search(startRe);
  if (start < 0) return '';
  const rest = text.slice(start);
  const end = rest.slice(1).search(endRe);
  return end >= 0 ? rest.slice(0, end + 1) : rest;
}

function parseAnswerKeys(fullText) {
  const normalized = cleanText(fullText);
  const answerStart = normalized.search(/ĐÁP\s*ÁN|DAP\s*AN|ANSWER\s*KEY/i);
  if (answerStart < 0) return { single: {}, tf: {}, short: {} };
  const tail = normalized.slice(answerStart);
  const result = { single: {}, tf: {}, short: {} };

  const p1 = sliceBetween(tail, /Ph(?:ầ|a)n\s*I\b/i, /Ph(?:ầ|a)n\s*II\b/i);
  const letters = (p1.match(/\b[A-H]\b/g) || []);
  // Loại các chữ trong tiêu đề, ưu tiên chuỗi sau từ "Đáp án".
  const ansLine = p1.match(/(?:Đáp\s*án|Dap\s*an)\s+([A-H](?:\s+[A-H]){1,100})/i);
  const mc = ansLine ? (ansLine[1].match(/[A-H]/g) || []) : letters;
  mc.forEach((a, i) => { result.single[i + 1] = a.toUpperCase(); });

  const p2 = sliceBetween(tail, /Ph(?:ầ|a)n\s*II\b/i, /Ph(?:ầ|a)n\s*III\b/i);
  for (const m of p2.matchAll(/Câu\s*(\d+)\s+((?:Đ|S|D|Đúng|Sai)(?:\s+(?:Đ|S|D|Đúng|Sai)){1,8})/gi)) {
    result.tf[Number(m[1])] = (m[2].match(/Đúng|Sai|Đ|D|S/gi) || []).map(v => /^(Đ|D|Đúng)$/i.test(v) ? 'true' : 'false');
  }

  const p3 = sliceBetween(tail, /Ph(?:ầ|a)n\s*III\b/i, /(?:PH(?:Ầ|A)N\s*I\b|HƯỚNG\s*DẪN|LỜI\s*GIẢI)/i);
  const shortLine = p3.match(/(?:Đáp\s*án|Dap\s*an)\s+([^\n]+)/i);
  if (shortLine) {
    let vals = shortLine[1].trim().split(/\s{1,}/).filter(Boolean);
    const questionHeader = p3.match(/Câu\s+((?:\d+\s+){1,30}\d+)/i);
    const expected = questionHeader ? (questionHeader[1].match(/\d+/g) || []).length : 0;
    // PDF thường tách số 1990 thành "199 0" do xuống dòng trong ô bảng.
    while (expected && vals.length > expected) {
      const i = vals.findIndex((v, idx) => idx > 0 && /^\d$/.test(v));
      if (i < 1) break;
      vals.splice(i - 1, 2, vals[i - 1] + vals[i]);
    }
    vals.slice(0, expected || vals.length).forEach((v, i) => { result.short[i + 1] = v; });
  }
  return result;
}

async function parsePdfExam(filePath) {
  const pageTexts = [];
  const data = await pdfParse(fs.readFileSync(filePath), {
    pagerender: async pageData => {
      const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const text = tc.items.map(item => item.str).join(' ');
      pageTexts.push(cleanText(text));
      return text;
    }
  });

  let currentSection = { title: 'PHẦN I', type: 'single_choice' };
  const questions = [];
  pageTexts.forEach((text, index) => {
    const detected = detectQuestionsOnPage(text, index + 1, currentSection);
    currentSection = detected.finalSection;
    const pageQuestions = detected.questions;
    for (const q of pageQuestions) {
      // Tránh lấy lại câu trong phần lời giải/đáp án: chỉ giữ trước trang bắt đầu đáp án.
      if (/ĐÁP\s*ÁN|ANSWER\s*KEY/i.test(text) && text.search(/ĐÁP\s*ÁN|ANSWER\s*KEY/i) < text.search(new RegExp(`Câu\\s*${q.number}\\b`, 'i'))) continue;
      questions.push(q);
    }
  });

  // Khử trùng theo phần + số câu, lấy lần xuất hiện đầu tiên (phần đề trước lời giải).
  const unique = [];
  const seen = new Set();
  for (const q of questions) {
    const key = `${q.sectionTitle}|${q.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }

  const keys = parseAnswerKeys(pageTexts.join('\n'));
  for (const q of unique) {
    if (q.type === 'single_choice' && keys.single[q.number]) q.answer = keys.single[q.number];
    if (q.type === 'true_false' && keys.tf[q.number]) q.answer = keys.tf[q.number].join(',');
    if (q.type === 'short_answer' && keys.short[q.number]) q.answer = keys.short[q.number];
  }

  return {
    pageCount: data.numpages || pageTexts.length,
    questions: unique,
    pageTexts,
    warnings: unique.length ? [] : ['Không tự tìm thấy số câu. Giáo viên có thể thêm câu thủ công.']
  };
}

module.exports = { parsePdfExam, parseAnswerKeys, detectQuestionsOnPage };
