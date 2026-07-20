'use strict';
const { tokenizeReferences } = require('./placeholderTokenizer');
const { renderReferences } = require('./assetRenderer');

function normalize(input) {
  return String(input || '').replace(/\r\n?/g, '\n').replace(/[\u200b\ufeff]/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
function romanToNumber(value) {
  const v = String(value || '').toUpperCase();
  if (/^\d+$/.test(v)) return Number(v);
  return ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 })[v] || null;
}
function detectRegions(text) {
  const answerMatch = /(?:^|\n)\s*(ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN|ANSWER\s*KEY)\s*(?:\n|$)/i.exec(text);
  if (!answerMatch) return { questionText: text, answerText: '', solutionText: '' };
  const questionText = text.slice(0, answerMatch.index).trim();
  const tail = text.slice(answerMatch.index + answerMatch[0].length).trim();
  const explicit = /(?:^|\n)\s*(LỜI\s*GIẢI(?:\s*CHI\s*TIẾT|\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI|SOLUTION)\s*(?:\n|$)/i.exec(tail);
  if (explicit) return { questionText, answerText: tail.slice(0, explicit.index).trim(), solutionText: tail.slice(explicit.index + explicit[0].length).trim() };

  // Trong nhiều đề Word: sau các bảng đáp án, tài liệu bắt đầu lại bằng "PHẦN I\nCâu 1" để trình bày lời giải.
  // Chỉ chọn tiêu đề phần có Câu 1 xuất hiện ngay sau đó và không có hàng bảng markdown nằm giữa.
  const partRe = /(?:^|\n)\s*PHẦN\s+(I{1,8}|\d+)\s*[:.]?\s*(?:\n|$)/gi;
  let match;
  const candidates = [];
  while ((match = partRe.exec(tail))) {
    const following = tail.slice(partRe.lastIndex, partRe.lastIndex + 350);
    const q = /^\s*Câu\s*1\s*[.:)]?(?:\s|\n)/i.exec(following);
    const hasTableBeforeQuestion = /^\s*\|/.test(following) || /^\s*(?:Câu|Đáp\s*án)\s*\|/i.test(following);
    if (q && !hasTableBeforeQuestion) candidates.push(match.index);
  }
  if (candidates.length) {
    const index = candidates[0];
    return { questionText, answerText: tail.slice(0, index).trim(), solutionText: tail.slice(index).trim() };
  }
  return { questionText, answerText: tail, solutionText: '' };
}
function splitSections(text) {
  const protectedText = tokenizeReferences(text);
  const src = protectedText.text;
  const re = /(?:^|\n)\s*(PHẦN|PART)\s+(I{1,8}|\d+)[ \t]*[:.]?[ \t]*([^\n]*)/gi;
  const marks = []; let match;
  while ((match = re.exec(src))) marks.push({ index: match.index, end: re.lastIndex, number: romanToNumber(match[2]), title: protectedText.restore(match[0].trim()), instruction: protectedText.restore(match[3] || '').trim() });
  if (!marks.length) return [{ id: 'section-1', number: 1, title: '', instruction: '', raw: text }];
  const result = [];
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    result.push({ id: `section-${mark.number || i + 1}`, number: mark.number || i + 1, title: mark.title, instruction: mark.instruction, raw: protectedText.restore(src.slice(mark.end, marks[i + 1] ? marks[i + 1].index : src.length)).trim() });
  }
  return result;
}
function splitQuestionBlocks(sectionRaw) {
  const protectedText = tokenizeReferences(sectionRaw);
  const src = protectedText.text;
  const re = /(?:^|\n)\s*(?:Câu|Bài|Question|Problem)\s*(\d{1,3})\s*[.:)]?\s*/gi;
  const marks = []; let match;
  while ((match = re.exec(src))) marks.push({ index: match.index, end: re.lastIndex, number: Number(match[1]) });
  return marks.map((mark, index) => ({ number: mark.number, raw: protectedText.restore(src.slice(mark.end, marks[index + 1] ? marks[index + 1].index : src.length)).trim() }));
}
function splitOptions(body) {
  const protectedText = tokenizeReferences(body);
  const src = protectedText.text;
  const patterns = [/(?:^|\n|\t| {2,})([A-H])\s*[.)]\s*/g, /(?:^|\s)([A-H])\s*[.)]\s+/g];
  let marks = [];
  for (const re of patterns) {
    marks = []; let match;
    while ((match = re.exec(src))) marks.push({ index: match.index, contentStart: re.lastIndex, label: match[1].toUpperCase() });
    if (marks.length >= 2) break;
  }
  if (marks.length < 2) return { stem: body.trim(), options: [] };
  const filtered = [];
  for (const mark of marks) {
    if (!filtered.length || mark.label.charCodeAt(0) === filtered[filtered.length - 1].label.charCodeAt(0) + 1) filtered.push(mark);
    else if (mark.label === 'A') { filtered.length = 0; filtered.push(mark); }
  }
  if (filtered.length < 2) return { stem: body.trim(), options: [] };
  const stem = protectedText.restore(src.slice(0, filtered[0].index)).trim();
  const options = filtered.map((mark, index) => ({ label: mark.label, raw: protectedText.restore(src.slice(mark.contentStart, filtered[index + 1] ? filtered[index + 1].index : src.length)).trim() }));
  return { stem, options };
}
function splitTrueFalse(body) {
  const protectedText = tokenizeReferences(body); const src = protectedText.text;
  const re = /(?:^|\n)\s*([a-h])\s*[.)]\s*/gi; const marks = []; let m;
  while ((m = re.exec(src))) marks.push({ index: m.index, start: re.lastIndex, label: m[1].toLowerCase() });
  if (marks.length < 2) return { stem: body.trim(), items: [] };
  return { stem: protectedText.restore(src.slice(0, marks[0].index)).trim(), items: marks.map((mark, index) => ({ label: mark.label, raw: protectedText.restore(src.slice(mark.start, marks[index + 1] ? marks[index + 1].index : src.length)).trim() })) };
}
function parseMarkdownRow(line) {
  if (!/^\s*\|/.test(line)) return [];
  return line.trim().replace(/^\||\|$/g, '').split('|').map(v => v.trim());
}
function parseAnswerKeys(answerText) {
  const keys = {};
  const lines = normalize(answerText).split('\n');
  let currentSection = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const part = line.match(/^Phần\s+(I{1,8}|\d+)/i);
    if (part) { currentSection = romanToNumber(part[1]) || currentSection; continue; }
    let m;
    if ((m = line.match(/^(?:Câu\s*)?(\d+)\s*[-:.]\s*([A-H])\b/i))) { setKey(keys, currentSection, Number(m[1]), m[2]); continue; }
    if ((m = line.match(/^Câu\s*(\d+)\s+((?:[ĐDSSTF](?:\s+|$)){2,8})/i))) { setKey(keys, currentSection, Number(m[1]), m[2]); continue; }

    const row = parseMarkdownRow(line);
    if (row.length) {
      // Hai hàng: | Câu | 1 | 2 | ... | và | Đáp án | D | B | ... |
      if (/^Câu$/i.test(row[0]) && i + 1 < lines.length) {
        const next = parseMarkdownRow(lines[i + 1]);
        if (next.length && /^Đáp\s*án$/i.test(next[0])) {
          row.slice(1).forEach((n, idx) => /^\d+$/.test(n) && next[idx + 1] != null && setKey(keys, currentSection, Number(n), next[idx + 1]));
          i++; continue;
        }
      }
      // Đúng/Sai: | Câu 1 | Đ | S | Đ | Đ |
      if ((m = row[0].match(/^Câu\s*(\d+)$/i))) {
        const vals = row.slice(1).filter(Boolean);
        if (vals.length >= 2) setKey(keys, currentSection, Number(m[1]), vals.map(v => /^(Đ|D|T|TRUE)$/i.test(v)));
        continue;
      }
    }
  }
  return keys;
}
function setKey(keys, section, number, value) { keys[`${section}:${number}`] = normalizeAnswerValue(value); }
function normalizeAnswerValue(value) {
  if (Array.isArray(value)) return value;
  const v = String(value || '').trim().replace(/[.]+$/, '');
  if (/^[A-H]$/i.test(v)) return v.toUpperCase();
  if (/^(?:[ĐDSSTF](?:[,;\s]+|$)){2,8}$/i.test(v)) return v.split(/[,;\s]+/).filter(Boolean).map(x => /^(Đ|D|T)$/i.test(x));
  return v;
}
function parseSolutions(solutionText) {
  const result = {};
  for (const sec of splitSections(solutionText)) {
    const section = sec.number || 1;
    for (const q of splitQuestionBlocks(sec.raw)) result[`${section}:${q.number}`] = q.raw.trim();
  }
  return result;
}
function inferType(section, stem, options, tfItems, answer) {
  const instruction = `${section.title || ''} ${section.instruction || ''}`;
  const isTfSection = /đúng\s*(?:hoặc|\/)?\s*sai|true\s*\/\s*false/i.test(instruction);
  const isShortSection = /trả\s*lời\s*ngắn|điền\s*(?:kết quả|đáp án)/i.test(instruction);
  if (isTfSection && tfItems.length >= 2) return 'true_false';
  if (options.length >= 2) return 'single_choice';
  if (tfItems.length >= 2 || Array.isArray(answer)) return 'true_false';
  if (answer != null && String(answer).trim() !== '') return 'short_answer';
  if (isShortSection) return 'short_answer';
  if (/chứng minh|trình bày|giải thích|lập luận|viết bài/i.test(stem)) return 'essay';
  return 'essay';
}
function buildDocument(rawText, assets = {}) {
  const text = normalize(rawText);
  const regions = detectRegions(text);
  const answerKeys = parseAnswerKeys(regions.answerText);
  const solutions = parseSolutions(regions.solutionText);
  const sections = splitSections(regions.questionText);
  const questions = [];
  for (const section of sections) {
    for (const q of splitQuestionBlocks(section.raw)) {
      const key = `${section.number || 1}:${q.number}`;
      const answer = answerKeys[key];
      const tf = splitTrueFalse(q.raw);
      const opts = splitOptions(q.raw);
      const type = inferType(section, opts.options.length >= 2 ? opts.stem : tf.items.length >= 2 ? tf.stem : q.raw, opts.options, tf.items, answer);
      const rawOptions = type === 'true_false' ? tf.items : opts.options;
      const stem = type === 'single_choice' ? opts.stem : type === 'true_false' ? tf.stem : q.raw;
      const solution = solutions[key] || '';
      const entry = {
        id: `q-${section.number || 1}-${q.number}`,
        sectionNumber: section.number || 1,
        sectionTitle: section.title || '',
        number: q.number,
        type,
        rawQuestion: stem,
        question: renderReferences(stem, assets),
        rawOptions: rawOptions.map(x => x.raw),
        options: rawOptions.map(x => renderReferences(x.raw, assets)),
        labels: rawOptions.map(x => x.label),
        answer: answer == null ? '' : answer,
        rawSolution: solution,
        explanation: renderReferences(solution, assets),
        points: type === 'true_false' ? 1 : type === 'essay' ? 1 : type === 'short_answer' ? 0.5 : 0.25,
        confidence: { question: stem ? 0.95 : 0.2, type: rawOptions.length >= 2 || answer ? 0.9 : 0.55, answer: answer !== undefined && answer !== '' ? 0.95 : 0.2, solution: solution ? 0.9 : 0 },
        warnings: []
      };
      if ((answer === undefined || answer === '') && type !== 'essay') entry.warnings.push('Chưa nhận diện được đáp án');
      if (type === 'single_choice' && rawOptions.length < 2) entry.warnings.push('Thiếu phương án');
      questions.push(entry);
    }
  }
  return { version: 2, rawText: text, regions, assets, sections: sections.map(s => ({ id: s.id, number: s.number, title: s.title, instruction: s.instruction })), questions };
}
module.exports = { buildDocument, detectRegions, splitSections, splitQuestionBlocks, splitOptions, splitTrueFalse, parseAnswerKeys, parseSolutions };
