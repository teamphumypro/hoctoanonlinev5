// Bo phan tich de thi theo mau thuong gap (Cau X: ... A. B. C. D. ... + bang dap an cuoi bai)
// Day la phuong an du phong mien phi, chay truoc AI. Ket qua chi la GOI Y BAN DAU,
// nguoi dung luon can xem lai va sua truoc khi luu (do do khong the chinh xac 100%).

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

// Tim bang dap an dang "1. A  2. C  3-B ..." hoac "Cau 1: A" o cuoi van ban (mau don gian, khong theo chuan 3 phan)
function extractAnswerKey(text) {
  const key = {};
  const keySectionMatch = text.match(/(đáp\s*án|answer\s*key)[\s\S]{0,3000}$/i);
  const searchText = keySectionMatch ? keySectionMatch[0] : text;
  const regex = /(?:câu\s*)?(\d{1,3})[\.\-:\)]\s*([A-D])\b/gi;
  let m;
  while ((m = regex.exec(searchText)) !== null) {
    key[parseInt(m[1])] = m[2].toUpperCase();
  }
  return key;
}

// Doc dung theo chuan de thi Bo GD-DT (Quyet dinh 764): bang dap an GOP CHUNG cuoi bai, chia 3 phan rieng:
// Phan I (trac nghiem 1 dap an): "Cau 1 2 3 ... Dap an D B B ..."
// Phan II (dung/sai 4 y a,b,c,d): "Cau a b c d" roi tung dong "Cau 1 D S S D"
// Phan III (tra loi ngan): "Cau 1 2 3 ... Dap an 3456 2656 ..."
function cleanLines(text) {
  return (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
}

// Đọc bảng đáp án kể cả khi Word tách từng ô của bảng thành một dòng riêng.
// Đây là kiểu xuất hiện trong các đề Bộ GD: Phần I/II/III + bảng đáp án + lời giải ngay phía sau.
function parseAnswerKeySections(answerKeyText) {
  const part1 = {}, part2 = {}, part3 = {};
  if (!answerKeyText) return { part1, part2, part3 };
  const lines = cleanLines(answerKeyText);
  const norm = v => v.normalize('NFC');

  function sectionRange(label, nextLabels) {
    const start = lines.findIndex(x => new RegExp(`^Phần\\s*${label}\\b`, 'i').test(x));
    if (start < 0) return [];
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (nextLabels.some(l => new RegExp(`^Phần\\s*${l}\\b`, 'i').test(lines[i]))) { end = i; break; }
      // Lời giải bắt đầu bằng PHẦN I in hoa sau khi đã đi qua bảng Phần III.
      if (label === 'III' && /^PHẦN\s*I\b/.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start, end);
  }

  const p1 = sectionRange('I', ['II']);
  const p2 = sectionRange('II', ['III']);
  const p3 = sectionRange('III', []);

  // Phần I: tìm chuỗi số sau "Câu", và chuỗi A-D sau "Đáp án".
  const p1Cau = p1.findIndex(x => /^Câu$/i.test(x));
  const p1Ans = p1.findIndex(x => /^Đáp\s*án$/i.test(x));
  if (p1Cau >= 0 && p1Ans > p1Cau) {
    const nums = p1.slice(p1Cau + 1, p1Ans).filter(x => /^\d{1,3}$/.test(x)).map(Number);
    const vals = p1.slice(p1Ans + 1).filter(x => /^[A-D]$/i.test(x)).map(x => x.toUpperCase());
    nums.forEach((n, i) => { if (vals[i]) part1[n] = vals[i]; });
  } else {
    const compact = p1.join(' ');
    const m = compact.match(/Câu\s+((?:\d+\s+)+\d+)\s*Đáp\s*án\s+((?:[A-D]\s*)+)/i);
    if (m) {
      const nums = m[1].trim().split(/\s+/).map(Number);
      const vals = m[2].trim().split(/\s+/);
      nums.forEach((n, i) => { if (vals[i]) part1[n] = vals[i].toUpperCase(); });
    }
  }

  // Phần II: Word thường tách "Câu 1", Đ, S, Đ, Đ thành 5 dòng liên tiếp.
  for (let i = 0; i < p2.length; i++) {
    const m = p2[i].match(/^Câu\s*(\d+)$/i);
    if (!m) continue;
    const vals = [];
    for (let j = i + 1; j < p2.length && vals.length < 4; j++) {
      const v = norm(p2[j]).toUpperCase();
      if (/^[ĐDS]$/.test(v)) vals.push(v === 'Đ' || v === 'D');
      else if (/^Câu\s*\d+/i.test(p2[j])) break;
    }
    if (vals.length === 4) part2[Number(m[1])] = vals;
  }
  // Dự phòng cho bảng bị ép thành một dòng.
  const p2Compact = p2.join(' ');
  const p2Regex = /Câu\s+(\d+)\s+([ĐDS])\s+([ĐDS])\s+([ĐDS])\s+([ĐDS])/gi;
  let m2;
  while ((m2 = p2Regex.exec(p2Compact))) {
    const b = v => v.toUpperCase() === 'Đ' || v.toUpperCase() === 'D';
    part2[Number(m2[1])] = [b(m2[2]), b(m2[3]), b(m2[4]), b(m2[5])];
  }

  // Phần III: các số câu rồi tới các giá trị đáp án tự do.
  const p3Cau = p3.findIndex(x => /^Câu$/i.test(x));
  const p3Ans = p3.findIndex(x => /^Đáp\s*án$/i.test(x));
  if (p3Cau >= 0 && p3Ans > p3Cau) {
    const nums = p3.slice(p3Cau + 1, p3Ans).filter(x => /^\d{1,3}$/.test(x)).map(Number);
    const vals = p3.slice(p3Ans + 1).filter(x => !/^PHẦN\s*I\b/.test(x));
    nums.forEach((n, i) => { if (vals[i] != null) part3[n] = vals[i]; });
  }

  return { part1, part2, part3 };
}

// Tách phần bảng đáp án và phần lời giải trong tài liệu có cấu trúc:
// ĐÁP ÁN THAM KHẢO -> Phần I/II/III (bảng) -> PHẦN I -> Câu 1... (lời giải).
function splitAnswerKeyAndSolutions(tail) {
  if (!tail) return { answerKeyText: '', solutionText: '' };
  const lines = tail.split('\n');
  let seenPart3 = false;
  let solutionIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Phần\s*III\b/i.test(lines[i])) seenPart3 = true;
    if (seenPart3 && /^\s*PHẦN\s*I\b/.test(lines[i])) { solutionIndex = i; break; }
  }
  if (solutionIndex < 0) return { answerKeyText: tail, solutionText: '' };
  return {
    answerKeyText: lines.slice(0, solutionIndex).join('\n'),
    solutionText: lines.slice(solutionIndex).join('\n')
  };
}

// Voi kieu de ghi dap an NGAY SAU tung cau (vd "Dap an: 6,19"), tach lay gia tri dap an do ra
function extractInlineAnswer(body) {
  const answerMatch = body.match(/\n?\s*(Đáp\s*án|Đáp\s*số|ĐA)\s*[:\.]\s*(.+?)(?=\n|$)/i);
  let answer = null;
  let withoutAnswer = body;
  if (answerMatch) {
    answer = answerMatch[2].trim();
    withoutAnswer = body.slice(0, answerMatch.index) + body.slice(answerMatch.index + answerMatch[0].length);
  }
  return { body: withoutAnswer, answer };
}

// Tach cac y a) b) c) d) cua 1 cau Dung/Sai tu noi dung cau hoi
function splitTrueFalseItems(body) {
  const itemRegex = /\n?\s*([a-d])\)\s*(.+?)(?=\n\s*[a-d]\)|$)/gs;
  const items = [];
  let m;
  while ((m = itemRegex.exec(body)) !== null) {
    items.push(m[2].trim().replace(/\n+/g, ' '));
  }
  return items;
}

// Doc phan "LOI GIAI THAM KHAO" o cuoi bai (neu co), tach loi giai rieng cho tung cau theo tung Phan
// (giong cach tach cau hoi o phan de bai, vi so thu tu cau cung bi lap lai giua cac Phan I/II/III)
function parseSolutions(solutionText) {
  const solutions = { 1: {}, 2: {}, 3: {} };
  if (!solutionText) return solutions;

  const lines = solutionText.split('\n');
  let part = 1;
  let currentNumber = null;
  let buffer = [];
  const flush = () => {
    if (currentNumber == null) return;
    const content = buffer.join('\n').trim();
    if (content) solutions[part][currentNumber] = content;
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const pm = line.match(/^PHẦN\s*(I{1,3}|[123])\b/i);
    if (pm) {
      flush(); currentNumber = null;
      const token = pm[1].toUpperCase();
      part = token === 'I' || token === '1' ? 1 : token === 'II' || token === '2' ? 2 : 3;
      continue;
    }
    const qm = line.match(/^Câu\s*(\d{1,3})[\.\:\)]?\s*(.*)$/i);
    if (qm) {
      flush();
      currentNumber = Number(qm[1]);
      buffer = qm[2] ? [qm[2]] : [];
      continue;
    }
    if (currentNumber != null) buffer.push(raw);
  }
  flush();
  return solutions;
}

function parseExamText(rawText, images = []) {
  const { restoreImages } = require('./extractText');
  let text = normalizeText(rawText);

  let solutions = { 1: {}, 2: {}, 3: {} };
  let answerKeyText = '';

  // Ưu tiên mốc ĐÁP ÁN: phần sau mốc có thể chứa cả bảng đáp án lẫn lời giải.
  const akMatch = text.match(/\n\s*(ĐÁP\s*ÁN(\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN)\b/i);
  if (akMatch) {
    const tail = text.slice(akMatch.index);
    const split = splitAnswerKeyAndSolutions(tail);
    answerKeyText = split.answerKeyText;
    if (split.solutionText) solutions = parseSolutions(split.solutionText);
    text = text.slice(0, akMatch.index);
  } else {
    const solutionMatch = text.match(/\n\s*(LỜI\s*GIẢI(\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI)\b/i);
    if (solutionMatch) {
      solutions = parseSolutions(text.slice(solutionMatch.index));
      text = text.slice(0, solutionMatch.index);
    }
  }
  const { part1: keyPart1, part2: keyPart2, part3: keyPart3 } = parseAnswerKeySections(answerKeyText);
  const legacyKey = extractAnswerKey(answerKeyText || text); // du phong cho de khong theo dung chuan 3 phan

  const blocks = text.split(/\n(?=(?:Câu|Bài|Question)\s*\d{1,3}[\.\:\)])/i);
  const questions = [];
  let currentPart = 0; // 0 = chua ro, 1/2/3 = dang o Phan I/II/III (theo doi qua cac dong tieu de "PHAN I/II/III" gap trong de bai)

  for (const block of blocks) {
    const partHeaderMatch = block.match(/PHẦN\s*(I{1,3}|[123])\s*[:\.]?/i);
    if (partHeaderMatch) {
      const p = partHeaderMatch[1].toUpperCase();
      currentPart = (p === 'I' || p === '1') ? 1 : (p === 'II' || p === '2') ? 2 : 3;
    }

    const headerMatch = block.match(/^(?:Câu|Bài|Question)\s*(\d{1,3})[\.\:\)]\s*/i);
    if (!headerMatch) continue;
    const qNumber = parseInt(headerMatch[1]);
    let body = block.slice(headerMatch[0].length).trim();

    const { body: bodyNoAnswer, answer: inlineAnswer } = extractInlineAnswer(body);
    body = bodyNoAnswer;
    const explanationRaw = solutions[currentPart === 2 || currentPart === 3 ? currentPart : 1] &&
      solutions[currentPart === 2 || currentPart === 3 ? currentPart : 1][qNumber];
    const explanation = explanationRaw ? restoreImages(explanationRaw, images) : null;

    if (currentPart === 2) {
      // ---- Phan II: Dung/Sai 4 y a) b) c) d) ----
      const itemTexts = splitTrueFalseItems(body);
      const firstItemIdx = body.search(/\n?\s*[a-d]\)\s*/);
      const questionText = restoreImages((firstItemIdx > -1 ? body.slice(0, firstItemIdx) : body).trim().replace(/\n+/g, ' '), images);
      const corrects = keyPart2[qNumber] || [];
      questions.push({
        type: 'true_false',
        part: 2,
        questionNumber: qNumber,
        question: questionText || `(Câu ${qNumber} — chưa nhận diện được nội dung, vui lòng sửa lại)`,
        points: 1,
        items: itemTexts.map((t, i) => ({ content: restoreImages(t, images), is_correct: corrects[i] === true })),
        explanation,
        needsReview: itemTexts.length < 2 || !keyPart2[qNumber]
      });
      continue;
    }

    if (currentPart === 3) {
      // ---- Phan III: Tra loi ngan ----
      const questionText = restoreImages(body.trim().replace(/\n+/g, ' '), images);
      const answer = keyPart3[qNumber] || inlineAnswer || '';
      questions.push({
        type: 'short_answer',
        part: 3,
        questionNumber: qNumber,
        question: questionText || `(Câu ${qNumber} — chưa nhận diện được nội dung)`,
        points: 0.5,
        correct_answer: answer,
        explanation,
        needsReview: !answer
      });
      continue;
    }

    // ---- Phan I (hoac de khong ghi ro Phan): Trac nghiem 1 dap an, hoac tu luan neu khong co A/B/C/D ----
    const optionRegex = /\n?\s*([A-D])[\.\)]\s*(.+?)(?=\n\s*[A-D][\.\)]|$)/gs;
    const options = [];
    let om;
    while ((om = optionRegex.exec(body)) !== null) {
      options.push({ letter: om[1].toUpperCase(), text: restoreImages(om[2].trim().replace(/\n+/g, ' '), images) });
    }
    const firstOptionIdx = body.search(/\n?\s*[A-D][\.\)]\s*/);
    const questionText = restoreImages((firstOptionIdx > -1 ? body.slice(0, firstOptionIdx) : body).trim().replace(/\n+/g, ' '), images);

    if (options.length >= 2) {
      const inlineLetterMatch = inlineAnswer && inlineAnswer.match(/^[A-D]$/i);
      const correctLetter = inlineLetterMatch ? inlineAnswer.toUpperCase() : (keyPart1[qNumber] || legacyKey[qNumber] || null);
      const correctIndex = correctLetter ? options.findIndex(o => o.letter === correctLetter) : -1;
      questions.push({
        type: 'single_choice',
        part: currentPart || 1,
        questionNumber: qNumber,
        question: questionText || `(Câu ${qNumber} — chưa nhận diện được nội dung, vui lòng sửa lại)`,
        points: 0.25,
        options: options.map(o => o.text),
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation,
        needsReview: correctIndex < 0
      });
    } else if (inlineAnswer) {
      questions.push({
        type: 'short_answer',
        part: currentPart || 1,
        questionNumber: qNumber,
        question: questionText || restoreImages(body.trim().replace(/\n+/g, ' '), images) || `(Câu ${qNumber} — chưa nhận diện được nội dung)`,
        points: 0.5,
        correct_answer: inlineAnswer,
        explanation,
        needsReview: false
      });
    } else {
      questions.push({
        type: 'essay',
        part: currentPart || 1,
        questionNumber: qNumber,
        question: questionText || restoreImages(body.trim().replace(/\n+/g, ' '), images) || `(Câu ${qNumber} — chưa nhận diện được nội dung)`,
        points: 1,
        explanation,
        needsReview: true
      });
    }
  }

  return questions;
}

module.exports = { parseExamText };
