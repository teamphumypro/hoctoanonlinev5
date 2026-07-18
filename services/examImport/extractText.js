const fs = require('fs');
const path = require('path');

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return { text: result.value, warnings: result.messages.map(m => m.message) };
  }

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return { text: data.text, warnings: [] };
  }

  if (ext === '.doc') {
    throw new Error('File .doc (Word cũ) chưa hỗ trợ đọc trực tiếp — vui lòng lưu lại dưới dạng .docx (Word 2007 trở lên) rồi upload lại.');
  }

  throw new Error('Chỉ hỗ trợ file .docx hoặc .pdf.');
}

module.exports = { extractTextFromFile };
