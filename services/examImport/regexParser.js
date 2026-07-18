// Nhan dien cau hoi tu van ban thuan (khong dung AI) - dua tren cac mau de thi tieng Viet pho bien.
// Day la phan tich "best effort": ket qua luon can nguoi rieng lai qua man hinh xem truoc.

function splitIntoQuestionBlocks(text) {
  // Cat van ban thanh tung khoi theo "Câu N" hoac "Câu N:" hoac "Câu N."
  const regex = /(?:^|\n)\s*C[aâ]u\s*(\d+)[\.:\)]?\s*/gi;
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return [];

  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    blocks.push({ number: matches[i][1], content: text.slice(start, end).trim() });
  }
  return blocks;
}

function parseSingleChoiceOrTrueFalse(block) {
  // Tim cac dong bat dau bang "A." "B." "C." "D." (hoa, cham) -> trac nghiem 1 dap an
  const mcLines = [...block.content.matchAll(/(?:^|\n)\s*([A-D])[\.\)]\s*(.+?)(?=\n\s*[A-D][\.\)]|\n\n|$)/gis)];

  // Tim cac dong bat dau bang "a)" "b)" "c)" "d)" (thuong, ngoac) -> dung/sai nhieu y
  const tfLines = [...block.content.matchAll(/(?:^|\n)\s*([a-d])\)\s*(.+?)(?=\n\s*[a-d]\)|\n\n|$)/gs)];

  if (mcLines.length >= 2) {
    const questionText = block.content.slice(0, mcLines[0].index).trim();
    const options = mcLines.map(m => m[2].trim().replace(/\s*\(Đúng\)|\s*\(Sai\)|\s*✓\s*$/i, ''));
    // Doan dap an dung: tim ky hieu (Đúng)/✓ canh phuong an, hoac "Đáp án: X" trong doan van
    let correctIndex = mcLines.findIndex(m => /\(Đúng\)|✓/i.test(m[2]));
    if (correctIndex === -1) {
      const ansMatch = block.content.match(/Đáp\s*án[:\s]+([A-D])/i);
      if (ansMatch) correctIndex = 'ABCD'.indexOf(ansMatch[1].toUpperCase());
    }
    return {
      type: 'single_choice',
      question: questionText || `(Câu ${block.number})`,
      points: 0.25,
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      lowConfidence: correctIndex === -1
    };
  }

  if (tfLines.length >= 2) {
    const questionText = block.content.slice(0, tfLines[0].index).trim();
    const items = tfLines.map(m => {
      const raw = m[2].trim();
      const markedTrue = /\(Đúng\)|✓|\bĐ\b\s*$/i.test(raw);
      const markedFalse = /\(Sai\)|✗|\bS\b\s*$/i.test(raw);
      return {
        content: raw.replace(/\(Đúng\)|\(Sai\)|✓|✗/gi, '').trim(),
        is_correct: markedTrue && !markedFalse
      };
    });
    return {
      type: 'true_false',
      question: questionText || `(Câu ${block.number})`,
      points: 1,
      items,
      lowConfidence: !tfLines.some(m => /\(Đúng\)|\(Sai\)|✓|✗/i.test(m[2]))
    };
  }

  // Khong tim thay phuong an -> tra loi ngan (neu ngan) hoac tu luan (neu dai)
  const ansMatch = block.content.match(/Đáp\s*án[:\s]+(.+)$/im);
  const questionText = ansMatch ? block.content.slice(0, ansMatch.index).trim() : block.content.trim();

  if (questionText.length > 280 && !ansMatch) {
    return { type: 'essay', question: questionText, points: 2 };
  }
  return {
    type: 'short_answer',
    question: questionText,
    points: 0.25,
    correct_answer: ansMatch ? ansMatch[1].trim() : '',
    lowConfidence: !ansMatch
  };
}

function parseExamText(rawText) {
  const text = rawText.replace(/\r\n/g, '\n');
  const blocks = splitIntoQuestionBlocks(text);
  if (blocks.length === 0) {
    return { questions: [], warning: 'Không tìm thấy mẫu "Câu 1, Câu 2..." trong văn bản. Có thể đề dùng định dạng khác — thử chọn chế độ AI hoặc nhập tay.' };
  }
  const questions = blocks.map(parseSingleChoiceOrTrueFalse);
  return { questions, warning: null };
}

module.exports = { parseExamText };
