/*
 * Bộ phân tích đề thi linh hoạt.
 * Không khóa số phần, số câu, số phương án, vị trí bảng đáp án hay vị trí lời giải.
 * Mọi kết quả đều là bản nháp có thể sửa ở màn hình review.
 */

function normalizeText(input) {
  return String(input || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripDiacritics(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');
}

function normalizeLabel(s) {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function romanToNumber(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (/^\d+$/.test(raw)) return Number(raw);
  const map = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  for (let i = 0; i < raw.length; i++) {
    const current = map[raw[i]] || 0;
    const next = map[raw[i + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total || null;
}

function isSectionHeader(line) {
  return /^\s*(?:PHẦN|Phần|SECTION|Section)\s+([IVXLCDM]+|\d+)\b\s*[:.\-–—]?\s*(.*)$/i.exec(line || '');
}

function isQuestionHeader(line) {
  return /^\s*(?:Câu|Bài|Question|Q)\s*(\d{1,4})(?:\s*[.:)\-–—])?\s*(.*)$/i.exec(line || '');
}

function isAnswerHeading(line) {
  return /^\s*(?:ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*SỐ|ANSWER\s*KEY)\s*[:.\-–—]?\s*$/i.test(line || '');
}

function isSolutionHeading(line) {
  return /^\s*(?:LỜI\s*GIẢI(?:\s*CHI\s*TIẾT|\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI|HƯỚNG\s*DẪN\s*CHẤM|GIẢI\s*CHI\s*TIẾT|SOLUTIONS?)\s*[:.\-–—]?\s*$/i.test(line || '');
}

function splitDocument(text) {
  const lines = normalizeText(text).split('\n');
  let answerAt = -1;
  let solutionAt = -1;

  for (let i = 0; i < lines.length; i++) {
    if (answerAt < 0 && isAnswerHeading(lines[i])) answerAt = i;
    if (solutionAt < 0 && isSolutionHeading(lines[i])) solutionAt = i;
  }

  // Nhiều tài liệu: ĐÁP ÁN -> các bảng -> PHẦN I -> Câu 1 -> lời giải, không có tiêu đề “Lời giải”.
  if (answerAt >= 0 && solutionAt < 0) {
    const seenOrders = new Set();
    for (let i = answerAt + 1; i < lines.length; i++) {
      const sm = isSectionHeader(lines[i]);
      if (!sm) continue;
      const order = romanToNumber(sm[1]);
      const lookahead = lines.slice(i + 1, i + 8).some(x => isQuestionHeader(x));
      // Chỉ coi là đầu lời giải khi một phần đã xuất hiện trong bảng đáp án rồi lặp lại.
      // Nhờ vậy Phần II/III của chính bảng đáp án không bị cắt nhầm.
      if (order != null && seenOrders.has(order) && lookahead) {
        solutionAt = i;
        break;
      }
      if (order != null) seenOrders.add(order);
    }
  }

  const mainEnd = [answerAt, solutionAt].filter(x => x >= 0).sort((a, b) => a - b)[0] ?? lines.length;
  const answerEnd = solutionAt >= 0 ? solutionAt : lines.length;
  return {
    mainText: lines.slice(0, mainEnd).join('\n').trim(),
    answerText: answerAt >= 0 ? lines.slice(answerAt + 1, answerEnd).join('\n').trim() : '',
    solutionText: solutionAt >= 0 ? lines.slice(solutionAt + (isSolutionHeading(lines[solutionAt]) ? 1 : 0)).join('\n').trim() : ''
  };
}

function detectTypeFromInstruction(text) {
  const n = normalizeLabel(text);
  if (/(dung hoac sai|dung sai|true false|chon dung|chon sai)/.test(n)) return 'true_false';
  if (/(tra loi ngan|dap so|dien dap an|short answer)/.test(n)) return 'short_answer';
  if (/(tu luan|trinh bay loi giai|essay)/.test(n)) return 'essay';
  if (/(chon mot phuong an|mot dap an|trac nghiem|multiple choice)/.test(n)) return 'single_choice';
  return null;
}

function parseSections(mainText) {
  const lines = normalizeText(mainText).split('\n');
  const sections = [];
  let current = { id: 'section-1', order: 1, title: '', instruction: '', hintedType: null, contentLines: [] };

  const pushCurrent = () => {
    if (!current.contentLines.some(x => isQuestionHeader(x))) return;
    current.hintedType = current.hintedType || detectTypeFromInstruction(`${current.title} ${current.instruction}`);
    sections.push(current);
  };

  for (const raw of lines) {
    const sm = isSectionHeader(raw);
    if (sm) {
      pushCurrent();
      const order = romanToNumber(sm[1]) || sections.length + 1;
      current = {
        id: `section-${order}-${sections.length + 1}`,
        order,
        title: raw.trim(),
        instruction: sm[2] || '',
        hintedType: detectTypeFromInstruction(raw),
        contentLines: []
      };
    } else {
      current.contentLines.push(raw);
    }
  }
  pushCurrent();

  // Tài liệu không có tiêu đề phần.
  if (!sections.length && lines.some(x => isQuestionHeader(x))) {
    sections.push({ id: 'section-1', order: 1, title: '', instruction: '', hintedType: null, contentLines: lines });
  }
  return sections;
}

function splitQuestionBlocks(lines) {
  const blocks = [];
  let current = null;
  for (const raw of lines) {
    const qm = isQuestionHeader(raw);
    if (qm) {
      if (current) blocks.push(current);
      current = { number: Number(qm[1]), headerTail: qm[2] || '', lines: [] };
      if (qm[2]) current.lines.push(qm[2]);
    } else if (current) {
      current.lines.push(raw);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function extractInlineMetadata(body) {
  let text = body;
  let answer = null;
  let explanation = null;
  const answerRegex = /(?:^|\n)\s*(?:Đáp\s*án|Đáp\s*số|ĐA|Answer)\s*[:.\-]\s*([^\n]+)/i;
  const am = answerRegex.exec(text);
  if (am) {
    answer = am[1].trim();
    text = `${text.slice(0, am.index)}\n${text.slice(am.index + am[0].length)}`;
  }
  const solutionRegex = /(?:^|\n)\s*(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*giải|Giải)\s*[:.\-]?\s*/i;
  const sm = solutionRegex.exec(text);
  if (sm) {
    explanation = text.slice(sm.index + sm[0].length).trim();
    text = text.slice(0, sm.index).trim();
  }
  return { body: text.trim(), answer, explanation };
}

function splitOptions(body) {
  /*
   * Word thường đặt toàn bộ A/B/C/D trên CÙNG MỘT DÒNG hoặc cùng một paragraph:
   *   "... là A. x=5.   B. x=3.   C. x=2.   D. x=4."
   * Parser cũ chỉ nhận phương án ở đầu dòng nên đã phân loại nhầm thành tự luận.
   *
   * Ta quét mọi marker A., B), C:, D-... nhưng chỉ chấp nhận một chuỗi nhãn
   * tăng dần bắt đầu từ A và có ít nhất 2 phương án. Cách này tránh tách nhầm
   * chữ "điểm A." hoặc ký hiệu A xuất hiện đơn lẻ trong nội dung toán.
   */
  const source = String(body || '');
  const markerRe = /(^|[\n\r\t ]+)([A-H])\s*[.)\]:\-–—]\s*/g;
  const candidates = [];
  let m;
  while ((m = markerRe.exec(source))) {
    candidates.push({
      label: m[2].toUpperCase(),
      start: m.index + m[1].length,
      contentStart: markerRe.lastIndex
    });
  }

  let best = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].label !== 'A') continue;
    const run = [candidates[i]];
    let expectedCode = 'B'.charCodeAt(0);
    for (let j = i + 1; j < candidates.length; j++) {
      const code = candidates[j].label.charCodeAt(0);
      if (code === expectedCode) {
        run.push(candidates[j]);
        expectedCode++;
      } else if (code >= expectedCode) {
        break;
      }
    }
    if (run.length > best.length) best = run;
  }

  if (best.length < 2) return { stem: source.trim(), options: [] };

  const options = best.map((item, index) => {
    const end = index + 1 < best.length ? best[index + 1].start : source.length;
    return { label: item.label, content: source.slice(item.contentStart, end).trim() };
  });

  return { stem: source.slice(0, best[0].start).trim(), options };
}

function splitTrueFalseItems(body) {
  // Không cố định 4 ý; hỗ trợ a), a., (a), 1), 2)...
  const marker = /(?:^|\n)\s*(?:\(([a-h])\)|([a-h])\s*[.)]|\((\d{1,2})\)|(\d{1,2})\s*[.)])\s*/gi;
  const hits = [];
  let m;
  while ((m = marker.exec(body))) hits.push({ index: m.index, end: marker.lastIndex, label: (m[1] || m[2] || m[3] || m[4]).toLowerCase() });
  if (hits.length < 2) return { stem: body.trim(), items: [] };
  const items = hits.map((h, i) => ({
    label: h.label,
    content: body.slice(h.end, i + 1 < hits.length ? hits[i + 1].index : body.length).trim()
  }));
  return { stem: body.slice(0, hits[0].index).trim(), items };
}

function parseBooleanToken(value) {
  const n = normalizeLabel(value);
  if (/^(d|dung|true|t|1)$/.test(n)) return true;
  if (/^(s|sai|false|f|0)$/.test(n)) return false;
  return null;
}

function tokenizeTableText(text) {
  return normalizeText(text)
    .replace(/\|/g, '\n')
    .split(/\n+/)
    .flatMap(line => {
      // Giữ số thập phân có dấu phẩy/chấm, nhưng tách các ô đơn giản bởi nhiều khoảng/tab.
      const pieces = line.split(/\t+| {2,}/).map(x => x.trim()).filter(Boolean);
      return pieces.length ? pieces : [line.trim()];
    })
    .filter(Boolean);
}

function parseAnswerSections(answerText) {
  const sections = [];
  if (!answerText) return sections;
  const lines = normalizeText(answerText).split('\n');
  let current = { order: 1, title: '', lines: [] };
  const push = () => {
    if (current.lines.length) sections.push(current);
  };
  for (const line of lines) {
    const sm = isSectionHeader(line);
    if (sm) {
      push();
      current = { order: romanToNumber(sm[1]) || sections.length + 1, title: line.trim(), lines: [] };
    } else current.lines.push(line);
  }
  push();
  if (!sections.length) sections.push({ order: 1, title: '', lines });
  return sections;
}

function parseAnswerSection(section) {
  const result = {};
  const text = section.lines.join('\n');
  const tokens = tokenizeTableText(text);

  // 1) Các dòng rõ ràng: "Câu 3: B", "3 - 5,91", "Câu 2 Đ S S Đ".
  for (const line of section.lines) {
    const row = line.trim();
    let m = /^(?:Câu\s*)?(\d{1,4})\s*[:.\-–—)]\s*(.+)$/i.exec(row);
    if (!m) m = /^Câu\s*(\d{1,4})\s+(.+)$/i.exec(row);
    if (!m) continue;
    const number = Number(m[1]);
    const values = m[2].trim().split(/[\s,;|]+/).filter(Boolean);
    const bools = values.map(parseBooleanToken);
    if (values.length >= 2 && bools.every(v => v !== null)) result[number] = bools;
    else if (values.length === 1) result[number] = values[0];
  }

  // 2) Bảng dạng hàng/cột: Câu | 1 | 2 | ... ; Đáp án | D | B | ...
  const cauIdx = tokens.findIndex(t => /^Câu$/i.test(t));
  const ansIdx = tokens.findIndex((t, i) => i > cauIdx && /^Đáp\s*án$/i.test(t));
  if (cauIdx >= 0 && ansIdx > cauIdx) {
    const nums = tokens.slice(cauIdx + 1, ansIdx).filter(t => /^\d{1,4}$/.test(t)).map(Number);
    const vals = tokens.slice(ansIdx + 1);
    nums.forEach((n, i) => {
      const v = vals[i];
      if (v != null && !/^Câu$/i.test(v)) result[n] = v;
    });
  }

  // 3) Bảng đúng/sai: mỗi dòng Câu N theo sau bởi số lượng Đ/S bất kỳ.
  const compact = section.lines.join(' ');
  const rowRe = /Câu\s*(\d{1,4})\s+((?:(?:Đ|D|S|Đúng|Sai|True|False)\s*){2,})/gi;
  let rm;
  while ((rm = rowRe.exec(compact))) {
    const vals = rm[2].match(/Đúng|Sai|True|False|Đ|D|S/gi) || [];
    const parsed = vals.map(parseBooleanToken);
    if (parsed.length >= 2 && parsed.every(v => v !== null)) result[Number(rm[1])] = parsed;
  }

  // 4) Danh sách ghép cặp đơn giản: 1 A 2 C 3 D hoặc "Câu 1 A Câu 2 B".
  const pairRe = /(?:Câu\s*)?(\d{1,4})\s*[:.\-–—)]?\s+([A-H])\b/gi;
  let pm;
  while ((pm = pairRe.exec(compact))) if (result[Number(pm[1])] == null) result[Number(pm[1])] = pm[2].toUpperCase();

  return result;
}

function parseAnswerKey(answerText) {
  const bySection = {};
  const sections = parseAnswerSections(answerText);
  sections.forEach((s, index) => { bySection[s.order || index + 1] = parseAnswerSection(s); });
  return bySection;
}

function parseSolutions(solutionText) {
  const bySection = {};
  if (!solutionText) return bySection;
  const lines = normalizeText(solutionText).split('\n');
  let sectionOrder = 1;
  let currentQuestion = null;
  let buffer = [];

  const flush = () => {
    if (currentQuestion == null) return;
    bySection[sectionOrder] ||= {};
    const value = buffer.join('\n').trim();
    if (value) bySection[sectionOrder][currentQuestion] = value;
    buffer = [];
  };

  for (const raw of lines) {
    const sm = isSectionHeader(raw);
    if (sm) {
      flush();
      currentQuestion = null;
      sectionOrder = romanToNumber(sm[1]) || sectionOrder + 1;
      continue;
    }
    const qm = isQuestionHeader(raw);
    if (qm) {
      flush();
      currentQuestion = Number(qm[1]);
      buffer = qm[2] ? [qm[2]] : [];
      continue;
    }
    if (currentQuestion != null) buffer.push(raw);
  }
  flush();
  return bySection;
}

function normalizeAnswerValue(value) {
  if (Array.isArray(value)) return value;
  return String(value == null ? '' : value).trim().replace(/^[:.\-–—]+/, '').trim();
}

function inferQuestionType(sectionHint, body, answerValue) {
  const { options } = splitOptions(body);
  const tf = splitTrueFalseItems(body);
  if (sectionHint === 'true_false' || (tf.items.length >= 2 && Array.isArray(answerValue))) return 'true_false';
  if (options.length >= 2) return 'single_choice';
  if (sectionHint === 'short_answer') return 'short_answer';
  if (sectionHint === 'essay') return 'essay';
  if (answerValue != null && normalizeAnswerValue(answerValue) !== '') return 'short_answer';
  if (tf.items.length >= 2 && /\b(?:đúng|sai|true|false)\b/i.test(body)) return 'true_false';
  return 'essay';
}

function restoreImages(text, images) {
  if (!text) return text;
  return String(text).replace(/\[\[IMG:(\d+)\]\]/g, (m, idx) => {
    const src = images[Number(idx)];
    return src ? `<img src=\"${src}\" style=\"max-width:100%;display:block;margin:6px 0\">` : '';
  });
}

function parseExamText(rawText, images = []) {
  const { mainText, answerText, solutionText } = splitDocument(rawText);
  const answerKey = parseAnswerKey(answerText);
  const solutions = parseSolutions(solutionText);
  const sections = parseSections(mainText);
  const questions = [];

  sections.forEach((section, sectionIndex) => {
    const sectionOrder = section.order || sectionIndex + 1;
    const sectionAnswers = answerKey[sectionOrder] || {};
    const sectionSolutions = solutions[sectionOrder] || {};
    const blocks = splitQuestionBlocks(section.contentLines);

    blocks.forEach((block) => {
      const joined = block.lines.join('\n').trim();
      const inline = extractInlineMetadata(joined);
      const answerValue = inline.answer != null ? inline.answer : sectionAnswers[block.number];
      const explanationRaw = inline.explanation || sectionSolutions[block.number] || null;
      const type = inferQuestionType(section.hintedType, inline.body, answerValue);
      const common = {
        type,
        part: sectionOrder,
        sectionTitle: section.title,
        questionNumber: block.number,
        explanation: explanationRaw ? restoreImages(explanationRaw, images) : null
      };

      if (type === 'single_choice') {
        const parsed = splitOptions(inline.body);
        const normalizedAnswer = normalizeAnswerValue(answerValue).toUpperCase();
        const letter = (/^[A-H]$/.test(normalizedAnswer) ? normalizedAnswer : ((normalizedAnswer.match(/\b([A-H])\b/) || [])[1] || '')).toUpperCase();
        const correctIndex = letter ? parsed.options.findIndex(o => o.label === letter) : -1;
        questions.push({
          ...common,
          question: restoreImages(parsed.stem.replace(/\n+/g, ' ').trim(), images) || `(Câu ${block.number} — cần kiểm tra nội dung)`,
          points: 0.25,
          options: parsed.options.map(o => restoreImages(o.content.replace(/\n+/g, ' ').trim(), images)),
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          needsReview: parsed.options.length < 2 || correctIndex < 0
        });
        return;
      }

      if (type === 'true_false') {
        const parsed = splitTrueFalseItems(inline.body);
        let values = Array.isArray(answerValue) ? answerValue : [];
        if (!values.length && typeof answerValue === 'string') {
          const candidates = answerValue.match(/Đúng|Sai|True|False|Đ|D|S/gi) || [];
          values = candidates.map(parseBooleanToken).filter(v => v !== null);
        }
        questions.push({
          ...common,
          question: restoreImages(parsed.stem.replace(/\n+/g, ' ').trim(), images) || `(Câu ${block.number} — cần kiểm tra nội dung)`,
          points: 1,
          items: parsed.items.map((item, i) => ({
            content: restoreImages(item.content.replace(/\n+/g, ' ').trim(), images),
            is_correct: values[i] === true
          })),
          needsReview: parsed.items.length < 2 || values.length !== parsed.items.length
        });
        return;
      }

      if (type === 'short_answer') {
        questions.push({
          ...common,
          question: restoreImages(inline.body.replace(/\n+/g, ' ').trim(), images) || `(Câu ${block.number} — cần kiểm tra nội dung)`,
          points: 0.5,
          correct_answer: normalizeAnswerValue(answerValue),
          needsReview: normalizeAnswerValue(answerValue) === ''
        });
        return;
      }

      questions.push({
        ...common,
        question: restoreImages(inline.body.replace(/\n+/g, ' ').trim(), images) || `(Câu ${block.number} — cần kiểm tra nội dung)`,
        points: 1,
        needsReview: !explanationRaw
      });
    });
  });

  return questions;
}

module.exports = {
  parseExamText,
  // Xuất thêm để có thể kiểm thử độc lập khi nâng cấp về sau.
  _internals: { splitDocument, parseSections, parseAnswerKey, parseSolutions, splitOptions, splitTrueFalseItems, inferQuestionType }
};
