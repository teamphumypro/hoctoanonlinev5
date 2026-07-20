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
function parseAnswerKeySections(answerKeyText) {
  const part1 = {}, part2 = {}, part3 = {};
  if (!answerKeyText) return { part1, part2, part3 };

  // Phan I: cau so + dap an la 1 chu cai A-D (chi lay doan TRUOC "Phan II" neu co, tranh dinh sang phan sau)
  const beforePart2 = answerKeyText.split(/Phần\s*II\b/i)[0];
  const p1Match = beforePart2.match(/Câu\s+((?:\d+\s+)+\d+)\s*Đáp\s*án\s+((?:[A-D]\s*)+[A-D])/i);
  if (p1Match) {
    const nums = p1Match[1].trim().split(/\s+/).map(Number);
    const letters = p1Match[2].trim().split(/\s+/);
    nums.forEach((n, i) => { if (letters[i]) part1[n] = letters[i].toUpperCase(); });
  }

  // Phan II: "Cau a b c d" (dong tieu de) roi cac dong "Cau N D S S D" hoac "Cau N Đ Đ S Đ"
  const p2Regex = /Câu\s+(\d+)\s+([ĐSDS])\s+([ĐSDS])\s+([ĐSDS])\s+([ĐSDS])/g;
  let m2;
  while ((m2 = p2Regex.exec(answerKeyText)) !== null) {
    const toBool = v => v === 'Đ' || v === 'D';
    part2[parseInt(m2[1])] = [toBool(m2[2]), toBool(m2[3]), toBool(m2[4]), toBool(m2[5])];
  }

  // Phan III: cau so + dap an la gia tri tu do (so/thap phan/phan so...), nam sau "Phan III"
  const afterPart3 = answerKeyText.match(/Phần\s*III\b[\s\S]*/i);
  if (afterPart3) {
    const p3Match = afterPart3[0].match(/Câu\s+((?:\d+\s+)+\d+)\s*Đáp\s*án\s+([\s\S]+?)(?=\n\s*(?:LỜI|HƯỚNG|$))/i);
    if (p3Match) {
      const nums = p3Match[1].trim().split(/\s+/).map(Number);
      const values = p3Match[2].trim().split(/\s+/);
      nums.forEach((n, i) => { if (values[i]) part3[n] = values[i]; });
    }
  }

  return { part1, part2, part3 };
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

  const blocks = solutionText.split(/\n(?=Câu\s*\d{1,3}[\.\:\)])/i);
  let part = 1;
  for (const block of blocks) {
    const partMatch = block.match(/PHẦN\s*(I{1,3}|[123])\b/i);
    if (partMatch) {
      const p = partMatch[1].toUpperCase();
      part = (p === 'I' || p === '1') ? 1 : (p === 'II' || p === '2') ? 2 : 3;
    }
    const headerMatch = block.match(/^Câu\s*(\d{1,3})[\.\:\)]\s*/i);
    if (!headerMatch) continue;
    const qNumber = parseInt(headerMatch[1]);
    const content = block.slice(headerMatch[0].length).trim().replace(/\n+/g, '\n');
    if (content) solutions[part][qNumber] = content;
  }
  return solutions;
}

function parseExamText(rawText, images = []) {
  const { restoreImages } = require('./extractText');
  let text = normalizeText(rawText);

  // Tach rieng phan "LOI GIAI THAM KHAO" ra khoi phan de bai (KHONG con vut bo nhu truoc —
  // gan lai lam "loi giai chi tiet" cho tung cau, giong cau truc "de + dap an + loi giai" cua Azota)
  let solutions = { 1: {}, 2: {}, 3: {} };
  const solutionMatch = text.match(/\n\s*(LỜI\s*GIẢI(\s*THAM\s*KHẢO)?|HƯỚNG\s*DẪN\s*GIẢI)\b/i);
  if (solutionMatch) {
    solutions = parseSolutions(text.slice(solutionMatch.index));
    text = text.slice(0, solutionMatch.index);
  }

  // Tach rieng bang dap an gop cuoi bai (neu co) ra khoi phan de bai, roi phan tich theo dung 3 phan chuan
  let answerKeyText = '';
  const akMatch = text.match(/\n\s*(ĐÁP\s*ÁN(\s*THAM\s*KHẢO)?|BẢNG\s*ĐÁP\s*ÁN)\b/i);
  if (akMatch) {
    answerKeyText = text.slice(akMatch.index);
    text = text.slice(0, akMatch.index);
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
        question: questionText || `(Câu ${qNumber} — chưa nhận diện được nội dung)`,
        points: 0.5,
        correct_answer: answer,
        explanation,
        needsReview: !answer
      });
      continue;
    }

    // ---- Phan I (hoac de khong ghi ro Phan): Trac nghiem 1 dap an, hoac tu luan neu khong co A/B/C/D ----
    // Phuong an co the xuong dong rieng (A.\nB.\nC.\nD.) HOAC nam chung 1 dong cach nhau bang Tab
    // (A. ... \t B. ... \t C. ... \t D. ...) - ca 2 kieu deu gap trong de thi thuc te
    const optionRegex = /[\n\t]?\s*([A-D])[\.\)]\s*(.+?)(?=[\n\t]\s*[A-D][\.\)]|$)/gs;
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
        question: questionText || restoreImages(body.trim().replace(/\n+/g, ' '), images) || `(Câu ${qNumber} — chưa nhận diện được nội dung)`,
        points: 0.5,
        correct_answer: inlineAnswer,
        explanation,
        needsReview: false
      });
    } else {
      questions.push({
        type: 'essay',
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
