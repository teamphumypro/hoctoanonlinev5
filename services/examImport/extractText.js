// Trich xuat van ban tho tu file Word (.docx), PDF, Excel (.xlsx), hoac anh (OCR) de dua vao bo phan tich de thi
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function extractFromDocx(filePath) {
  // Uu tien doc "day du" (giu dung vi tri cong thuc Equation lan anh nhung) —
  // neu buoc nay loi vi ly do gi (file qua la, cau truc khong chuan...), tu dong quay ve
  // cach doc chu thuong (an toan, da chay on dinh) de KHONG lam hong tinh nang dang co.
  try {
    const { extractDocxRich } = require('./docxRichExtractor');
    const result = await extractDocxRich(filePath);
    if (result && result.text && result.text.trim().length > 0) return result;
  } catch (err) {
    console.error('Doc docx "day du" that bai, quay ve cach doc chu thuong:', err.message);
  }

  const images = [];
  const result = await mammoth.convertToHtml({ path: filePath }, {
    convertImage: mammoth.images.imgElement(async (image) => {
      const b64 = await image.read('base64');
      const idx = images.length;
      images.push(`data:${image.contentType};base64,${b64}`);
      return { src: `__IMGPLACEHOLDER_${idx}__` };
    })
  });
  let text = result.value
    .replace(/<img[^>]*src="__IMGPLACEHOLDER_(\d+)__"[^>]*>/g, '[[IMG:$1]]')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { text, images };
}

async function extractFromPdf(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);

  // Truoc day ham nay chi lay chu (pdf-parse), lam mat toan bo anh/hinh minh hoa nhung trong PDF.
  // Gio trich them anh JPEG nhung (neu co) va gan xap xi vao dung trang - xem gioi han chi tiet
  // va ly do khong dung thu vien PDF-render ngoai (khong co mang de cai) trong pdfImageExtractor.js.
  let images = [];
  let pageImageMap = {};
  try {
    const { extractPdfImages } = require('./pdfImageExtractor');
    const extracted = extractPdfImages(buffer);
    images = extracted.images;
    pageImageMap = extracted.pageImageMap;
  } catch (err) {
    console.error('Khong trich xuat duoc anh nhung trong PDF (bo qua, chi giu van ban):', err.message);
  }

  const pageTexts = [];
  let data;
  try {
    data = await pdfParse(buffer, {
      pagerender: (pageData) => pageData.getTextContent().then((textContent) => {
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) text += item.str;
          else text += '\n' + item.str;
          lastY = item.transform[5];
        }
        pageTexts.push(text);
        return text;
      })
    });
  } catch (err) {
    // Neu vi ly do gi pagerender loi (vd file la, phien ban PDF khac thuong), quay ve doc chu
    // binh thuong nhu truoc day - khong lam vo tinh nang doc PDF dang chay on dinh.
    data = await pdfParse(buffer);
    return { text: data.text, images };
  }

  if (pageTexts.length === 0) {
    // pagerender khong sinh duoc trang nao (hiem, vd PDF 0 trang chu) -> dung ket qua mac dinh cua pdf-parse
    return { text: data.text || '', images };
  }

  // Noi van ban tung trang lai va chen [[IMG:n]] cua dung trang do ngay sau noi dung trang
  // (xap xi theo trang, khong phai dung vi tri inline nhu DOCX - xem ghi chu trong pdfImageExtractor.js)
  let text = '';
  pageTexts.forEach((pageText, idx) => {
    text += pageText.trim();
    (pageImageMap[idx] || []).forEach((imgIdx) => { text += `\n[[IMG:${imgIdx}]]`; });
    text += '\n\n';
  });

  return { text: text.trim(), images };
}

// Doc file Excel: gom het noi dung cac o theo tung dong, moi dong 1 dong van ban,
// giup bo phan tich cau hoi (regex/AI) xu ly duoc y nhu doc file docx/pdf
async function extractFromExcel(filePath) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  let lines = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    rows.forEach(row => {
      const line = row.map(cell => (cell === undefined || cell === null) ? '' : String(cell).trim()).filter(Boolean).join(' ');
      if (line) lines.push(line);
    });
  });
  return lines.join('\n');
}

// Doc chu trong anh bang OCR (Tesseract, mien phi, ho tro tieng Viet).
// Luu y: do chinh xac THAP HON nhieu so voi doc file docx/pdf that su, dac biet voi cong thuc Toan/Ly/Hoa
// va anh chup nghieng/mo/thieu sang - chi nen dung khi khong co san file goc.
// (Tam thoi go bo goi tesseract.js khoi package.json vi qua nang, gay loi "npm install" tren goi Render
// Free - neu ban muon bat lai tinh nang doc anh, them lai "tesseract.js" vao package.json va can nang cap
// goi Render du tai nguyen build.)
async function extractFromImage(filePath) {
  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch (e) {
    throw new Error('Tính năng đọc ảnh (OCR) hiện chưa được bật trên server này. Vui lòng dùng file .docx/.pdf/.xlsx thay thế.');
  }
  const { data } = await Tesseract.recognize(filePath, 'vie+eng');
  return data.text;
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') return extractFromDocx(filePath); // { text, images }
  if (ext === '.pdf') return extractFromPdf(filePath); // { text, images } - xem ghi chu trong extractFromPdf
  if (ext === '.xlsx' || ext === '.xls') return { text: await extractFromExcel(filePath), images: [] };
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return { text: await extractFromImage(filePath), images: [] };
  throw new Error('Chỉ hỗ trợ file .docx, .pdf, .xlsx hoặc ảnh (.jpg/.png)');
}

// Thay cac token [[IMG:n]] bang the <img> that su, dung o buoc cuoi sau khi da tach xong tung cau/dap an
function restoreImages(text, images) {
  if (!text) return text;
  return text.replace(/\[\[IMG:(\d+)\]\]/g, (m, idx) => {
    const src = images[parseInt(idx)];
    return src ? `<img src="${src}" style="max-width:100%;display:block;margin:6px 0">` : '';
  });
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
  else if (contentType.includes('spreadsheetml') || contentType.includes('ms-excel')) ext = '.xlsx';
  else if (contentType.includes('image/png')) ext = '.png';
  else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) ext = '.jpg';
  else if (contentType.includes('pdf')) ext = '.pdf';

  // Tu tao thu muc neu chua co, khong phu thuoc vao viec thu muc rong da duoc dua len GitHub hay chua
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, uuidv4() + ext);
  fs.writeFileSync(destPath, response.data);
  return destPath;
}

module.exports = { extractText, downloadFromDriveLink, restoreImages };
