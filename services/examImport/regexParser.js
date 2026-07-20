/*
 * Bộ nhận diện đề thi linh hoạt.
 * Không khóa số phần/số câu và không suy luận loại câu chỉ từ tên phần.
 * Placeholder ảnh/công thức được bảo vệ trước khi tách câu/phương án.
 */

function restoreImages(text, images = []) {
  if (!text) return text;
  return String(text).replace(/\[\[IMG:(\d+)\]\]/g, (m, idx) => {
    const asset = images[Number(idx)];
    if (!asset) return m;
    const src = typeof asset === 'string' ? asset : asset.src;
    const kind = typeof asset === 'string' ? 'image' : (asset.kind || 'image');
    if (!src) return m;
    if (kind === 'math') {
      return `<img src="${src}" data-exam-asset="math" alt="công thức" style="display:inline-block!important;vertical-align:middle!important;width:auto!important;height:auto!important;max-height:1.7em!important;max-width:min(100%,22em)!important;object-fit:contain!important;margin:0 .12em!important;line-height:1!important">`;
    }
    return `<img src="${src}" data-exam-asset="image" alt="hình minh họa" style="display:block!important;width:auto!important;height:auto!important;max-width:100%!important;max-height:520px!important;object-fit:contain!important;margin:8px auto!important">`;
  });
}

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

// Bảo vệ inline assets để các ký tự trong MathML/token không làm hỏng regex tách câu/A-B-C-D.
function protectAssets(text) {
  const assets = [];
  const patterns = [
    /\[!m:\$[^$]+\$\]/gi,
    /\[!?img:\$[^$]+\$\]/gi,
    /\[\[(?:IMG|MATH):[^\]]+\]\]/gi,
    /<math\b[\s\S]*?<\/math>/gi,
    /<img\b[^>]*>/gi
  ];
  let result = text;
  patterns.forEach(pattern => {
    result = result.replace(pattern, token => {
      const id = assets.length;
      assets.push(token);
      return `@@ASSET_${id}@@`;
    });
  });
  return {
    text: result,
    restore(value = '') {
      return String(value).replace(/@@ASSET_(\d+)@@/g, (_, n) => assets[Number(n)] || '');
    }
  };
}

function romanToNumber(value) {
  const v = String(value || '').toUpperCase();
  if (/^\d+$/.test(v)) return Number(v);
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  return map[v] || 0;
}

function sectionAt(text, position) {
  const re = /(?:^|\n)\s*(?:PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\s*[:.\-]?[^\n]*/gi;
  let match;
  let selected = { number: 0, title: '' };
  while ((match = re.exec(text)) && match.index < position) {
    selected = { number: romanToNumber(match[1]), title: match[0].trim() };
  }
  return selected;
}

function findQuestionMarkers(text) {
  const re = /(?:^|\n)\s*(?:Câu|Cau|Bài|Bai|Question|Problem)\s*(\d{1,4})(?:\s*[.:)]\s*|\s*(?=\n))/gi;
  const markers = [];
  let m;
  while ((m = re.exec(text))) {
    const prefix = m[0];
    const start = m.index + (prefix.startsWith('\n') ? 1 : 0);
    markers.push({ start, contentStart: re.lastIndex, number: Number(m[1]), raw: m[0].trim() });
  }
  return markers;
}

function splitQuestionBlocks(text) {
  const markers = findQuestionMarkers(text);
  return markers.map((marker, index) => {
    const end = index + 1 < markers.length ? markers[index + 1].start : text.length;
    return {
      ...marker,
      end,
      body: text.slice(marker.contentStart, end).trim(),
      section: sectionAt(text, marker.start)
    };
  });
}

function splitDocument(raw) {
  const answerHeading = /(?:^|\n)\s*(?:ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN|ANSWER\s*KEY)\b/i;
  const m = answerHeading.exec(raw);
  if (!m) return { examText: raw, answerText: '', solutionText: '' };

  const examText = raw.slice(0, m.index).trim();
  const tail = raw.slice(m.index).trim();

  // Trong nhiều đề, sau bảng đáp án không có chữ “Lời giải”; phần giải bắt đầu lại bằng PHẦN I + Câu 1.
  const explicitSolution = /(?:^|\n)\s*(?:LỜI\s*GIẢI(?:\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI|SOLUTION|EXPLANATION)\b/i.exec(tail);
  let solutionIndex = explicitSolution ? explicitSolution.index : -1;
  if (solutionIndex < 0) {
    // Bảng đáp án thường cũng có tiêu đề “Phần I”, vì vậy chỉ coi là lời giải từ
    // lần xuất hiện Phần I tiếp theo sau vùng bảng đáp án.
    const sectionStarts = [];
    const sectionRe = /(?:^|\n)\s*(?:PHẦN|PHAN|PART)\s*(?:I|1)\s*[:.\-]?/gi;
    let sm;
    while ((sm = sectionRe.exec(tail))) sectionStarts.push(sm.index);
    if (sectionStarts.length >= 2) solutionIndex = sectionStarts[1];
    else if (sectionStarts.length === 1) {
      const after = tail.slice(sectionStarts[0]);
      if (/\n\s*(?:Câu|Cau|Question)\s*1(?:\s*[.:)]|\s*\n)/i.test(after) && !/Đáp\s*án/i.test(after.slice(0, 200))) {
        solutionIndex = sectionStarts[0];
      }
    }
  }

  if (solutionIndex >= 0) {
    return {
      examText,
      answerText: tail.slice(0, solutionIndex).trim(),
      solutionText: tail.slice(solutionIndex).trim()
    };
  }
  return { examText, answerText: tail, solutionText: '' };
}

function parseGenericAnswerKeys(answerText) {
  const bySection = {};
  if (!answerText) return bySection;

  const sections = [];
  const re = /(?:^|\n)\s*(?:PHẦN|PHAN|PART)\s*(I{1,6}|\d+)\b/gi;
  let m;
  while ((m = re.exec(answerText))) sections.push({ index: m.index, number: romanToNumber(m[1]) });
  if (!sections.length) sections.push({ index: 0, number: 0 });

  sections.forEach((s, idx) => {
    const chunk = answerText.slice(s.index, idx + 1 < sections.length ? sections[idx + 1].index : answerText.length);
    const key = bySection[s.number] || (bySection[s.number] = {});

    // Dạng “Câu 1 D”, “Câu 1: D”, “1-D”.
    let x;
    const direct = /(?:Câu\s*)?(\d{1,4})\s*[:.\-) ]+\s*([A-HĐDS])\b/gi;
    while ((x = direct.exec(chunk))) key[Number(x[1])] = normalizeAnswer(x[2]);

    // Dạng bảng hàng ngang: Câu 1 2 3 ... / Đáp án D B C ...
    const table = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+((?:[A-HĐDS]\s*){2,})/i.exec(chunk);
    if (table) {
      const nums = (table[1].match(/\d+/g) || []).map(Number);
      const vals = table[2].match(/(?:Đ|D|S|[A-H])/gi) || [];
      nums.forEach((n, i) => { if (vals[i]) key[n] = normalizeAnswer(vals[i]); });
    }

    // Đúng/sai: Câu 1 Đ S Đ Đ (số lượng ý linh hoạt).
    const tf = /Câu\s*(\d{1,4})\s+((?:(?:Đ|D|S)\s*){2,})/gi;
    while ((x = tf.exec(chunk))) {
      key[Number(x[1])] = (x[2].match(/Đ|D|S/gi) || []).map(v => /Đ|D/i.test(v));
    }

    // Trả lời ngắn theo bảng: hàng số câu + hàng đáp án tự do.
    const short = /Câu\s+((?:\d+\s+){1,}\d+)\s*Đáp\s*án\s+([\s\S]+?)(?=\n\s*(?:PHẦN|PHAN|PART|$))/i.exec(chunk);
    if (short) {
      const nums = short[1].match(/\d+/g).map(Number);
      let vals = short[2].trim().split(/\s+/).filter(Boolean);
      // Ghép trường hợp số bị Word bẻ dòng “199” + “0” thành 1990 chỉ khi dư token.
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

function normalizeAnswer(v) {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'Đ' || s === 'DUNG' || s === 'ĐÚNG') return true;
  if (s === 'S' || s === 'SAI') return false;
  return s;
}

function parseSolutions(solutionText, images) {
  const result = {};
  if (!solutionText) return result;
  splitQuestionBlocks(solutionText).forEach(block => {
    const sectionNo = block.section.number || 0;
    result[sectionNo] ||= {};
    let content = block.body.trim();
    // Không kéo tiêu đề phần kế tiếp vào lời giải câu cuối.
    content = content.replace(/\n\s*(?:PHẦN|PHAN|PART)\s*(?:I{1,6}|\d+)\b[\s\S]*$/i, '').trim();
    if (content) result[sectionNo][block.number] = restoreImages(content, images);
  });
  return result;
}

function splitInlineOptions(body) {
  const protectedData = protectAssets(body);
  const text = protectedData.text;
  // Nhãn phải ở đầu dòng hoặc sau khoảng trắng; lookahead tới nhãn tiếp theo từ A-H hoặc hết câu.
  const markerRe = /(?:^|[\n\t ]{1,})([A-H])\s*[.)]\s*/g;
  const markers = [];
  let m;
  while ((m = markerRe.exec(text))) {
    const label = m[1].toUpperCase();
    const labelIndex = m.index + m[0].lastIndexOf(m[1]);
    markers.push({ label, markerStart: m.index, contentStart: markerRe.lastIndex, labelIndex });
  }

  // Chọn chuỗi nhãn tăng dần dài nhất để tránh nhầm “điểm A.” trong thân câu.
  let best = [];
  for (let i = 0; i < markers.length; i++) {
    const seq = [markers[i]];
    let expected = markers[i].label.charCodeAt(0) + 1;
    for (let j = i + 1; j < markers.length; j++) {
      const code = markers[j].label.charCodeAt(0);
      if (code === expected) { seq.push(markers[j]); expected++; }
      else if (code > expected) break;
    }
    if (seq.length > best.length) best = seq;
  }
  if (best.length < 2) return { stem: protectedData.restore(body).trim(), options: [] };

  const stem = protectedData.restore(text.slice(0, best[0].markerStart)).trim();
  const options = best.map((marker, i) => {
    const end = i + 1 < best.length ? best[i + 1].markerStart : text.length;
    return {
      label: marker.label,
      text: protectedData.restore(text.slice(marker.contentStart, end)).trim().replace(/\s+$/g, '')
    };
  });
  return { stem, options };
}

function splitTrueFalse(body) {
  const protectedData = protectAssets(body);
  const text = protectedData.text;
  const re = /(?:^|\n|\s{2,})([a-h])\s*[.)]\s*/gi;
  const markers = [];
  let m;
  while ((m = re.exec(text))) markers.push({ label: m[1].toLowerCase(), start: m.index, contentStart: re.lastIndex });
  if (markers.length < 2) return { stem: protectedData.restore(body).trim(), items: [] };
  const stem = protectedData.restore(text.slice(0, markers[0].start)).trim();
  const items = markers.map((marker, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    return protectedData.restore(text.slice(marker.contentStart, end)).trim();
  });
  return { stem, items };
}

function extractInlineAnswer(body) {
  const m = /(?:^|\n)\s*(?:Đáp\s*án|Đáp\s*số|Answer|ĐA)\s*[:.]\s*(.+?)(?=\n|$)/i.exec(body);
  if (!m) return { body, answer: null };
  return { body: (body.slice(0, m.index) + body.slice(m.index + m[0].length)).trim(), answer: m[1].trim() };
}

function cleanInline(value, images) {
  return restoreImages(String(value || '').replace(/\n{2,}/g, '\n').trim(), images);
}

function parseExamText(rawText, images = []) {
  const normalized = normalizeText(rawText);
  const { examText, answerText, solutionText } = splitDocument(normalized);
  const answers = parseGenericAnswerKeys(answerText);
  const solutions = parseSolutions(solutionText, images);
  const blocks = splitQuestionBlocks(examText);
  const questions = [];

  blocks.forEach(block => {
    const sectionNo = block.section.number || 0;
    const sectionAnswers = answers[sectionNo] || answers[0] || {};
    const answer = sectionAnswers[block.number];
    const explanation = solutions[sectionNo]?.[block.number] || solutions[0]?.[block.number] || null;
    const inline = extractInlineAnswer(block.body);
    const body = inline.body;
    const resolvedAnswer = inline.answer != null ? inline.answer : answer;

    const tf = splitTrueFalse(body);
    const optionsData = splitInlineOptions(body);

    // Loại câu được suy luận từ cấu trúc thực tế, không khóa theo tên phần.
    if (tf.items.length >= 2 && (Array.isArray(resolvedAnswer) || /đúng\s*(?:hoặc|\/)?\s*sai/i.test(block.section.title + ' ' + body))) {
      const flags = Array.isArray(resolvedAnswer) ? resolvedAnswer : [];
      questions.push({
        type: 'true_false',
        question: cleanInline(tf.stem, images) || `Câu ${block.number}`,
        points: 1,
        items: tf.items.map((content, i) => ({ content: cleanInline(content, images), is_correct: flags[i] === true })),
        explanation,
        section: sectionNo,
        sourceNumber: block.number,
        needsReview: !Array.isArray(resolvedAnswer) || tf.items.length < 2
      });
      return;
    }

    if (optionsData.options.length >= 2) {
      const answerLetter = typeof resolvedAnswer === 'string' && /^[A-H]$/i.test(resolvedAnswer.trim()) ? resolvedAnswer.trim().toUpperCase() : null;
      const correctIndex = answerLetter ? optionsData.options.findIndex(o => o.label === answerLetter) : -1;
      questions.push({
        type: 'single_choice',
        question: cleanInline(optionsData.stem, images) || `Câu ${block.number}`,
        points: 0.25,
        options: optionsData.options.map(o => cleanInline(o.text, images)),
        optionLabels: optionsData.options.map(o => o.label),
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation,
        section: sectionNo,
        sourceNumber: block.number,
        needsReview: correctIndex < 0
      });
      return;
    }

    if (resolvedAnswer != null && !Array.isArray(resolvedAnswer)) {
      questions.push({
        type: 'short_answer',
        question: cleanInline(body, images) || `Câu ${block.number}`,
        points: 0.5,
        correct_answer: String(resolvedAnswer),
        explanation,
        section: sectionNo,
        sourceNumber: block.number,
        needsReview: false
      });
      return;
    }

    questions.push({
      type: 'essay',
      question: cleanInline(body, images) || `Câu ${block.number}`,
      points: 1,
      explanation,
      section: sectionNo,
      sourceNumber: block.number,
      needsReview: true
    });
  });

  return questions;
}

module.exports = {
  parseExamText,
  normalizeText,
  protectAssets,
  splitInlineOptions,
  splitTrueFalse,
  parseGenericAnswerKeys,
  splitDocument
};
