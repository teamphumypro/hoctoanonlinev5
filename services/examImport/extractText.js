// Trich xuat van ban tho tu file Word (.docx) hoac PDF de dua vao bo phan tich de thi
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function extractFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  // Luu y: mammoth chi doc duoc chu thuong, KHONG doc duoc cong thuc Toan/Ly/Hoa
  // duoc chen bang cong cu Equation cua Word (day la gioi han ky thuat, khong phai loi code)
  return result.value;
}

async function extractFromPdf(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  // Luu y: chi doc duoc PDF co chu thuc (van ban), KHONG doc duoc PDF dang anh scan
  return data.text;
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') return extractFromDocx(filePath);
  if (ext === '.pdf') return extractFromPdf(filePath);
  throw new Error('Chỉ hỗ trợ file .docx hoặc .pdf');
}

// Tai file tu link Google Drive (dang chia se cong khai) ve thu muc tam, tra ve duong dan file da tai
async function downloadFromDriveLink(driveUrl, destDir) {
  const idMatch = driveUrl.match(/\/d\/([\w-]+)/) || driveUrl.match(/[?&]id=([\w-]+)/);
  if (!idMatch) throw new Error('Không nhận diện được ID file từ link Google Drive. Đảm bảo link dạng .../file/d/XXXX/view và đã bật chia sẻ công khai.');
  const fileId = idMatch[1];
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const response = await axios.get(directUrl, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const contentType = (response.headers['content-type'] || '').toLowerCase();

  if (contentType.includes('text/html')) {
    throw new Error('Google Drive trả về trang xác nhận thay vì file thật — thường xảy ra với file dung lượng lớn (>25MB) hoặc link chưa bật chia sẻ công khai ("Bất kỳ ai có đường liên kết"). Hãy thử tải file về máy rồi upload trực tiếp thay vì dùng link.');
  }

  let ext = '.pdf';
  if (contentType.includes('wordprocessingml') || contentType.includes('msword')) ext = '.docx';
  else if (contentType.includes('pdf')) ext = '.pdf';

  // Tu tao thu muc neu chua co, khong phu thuoc vao viec thu muc rong da duoc dua len GitHub hay chua
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, uuidv4() + ext);
  fs.writeFileSync(destPath, response.data);
  return destPath;
}

module.exports = { extractText, downloadFromDriveLink };
