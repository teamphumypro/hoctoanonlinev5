const assert = require('assert');
const { extractPdfImages } = require('../services/examImport/pdfImageExtractor');

// Tu dung 1 file PDF toi gian bang tay (khong can thu vien PDF nao) de kiem tra logic quet
// object/dictionary/stream cua pdfImageExtractor.js - khong can file PDF mau that.
function buildFakePdf() {
  const jpegBytes = Buffer.from([0xff, 0xd8, 0x00, 0x01, 0x02, 0x03, 0xff, 0xd9]); // gia lap SOI...EOI, du de nhan la "trong JPEG"
  const parts = [];
  const push = (str) => parts.push(Buffer.from(str, 'latin1'));

  push('%PDF-1.4\n');
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n');
  // Trang 1: khong co anh nao
  push('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << >> >> /Contents 5 0 R >>\nendobj\n');
  // Trang 2: co 1 anh (Im0 tro toi object 6)
  push('4 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 6 0 R >> >> /Contents 7 0 R >>\nendobj\n');
  push('5 0 obj\n<< /Length 10 >>\nstream\nBT ET     \nendstream\nendobj\n');
  push(`6 0 obj\n<< /Type /XObject /Subtype /Image /Filter /DCTDecode /Width 2 /Height 2 /Length ${jpegBytes.length} >>\nstream\n`);
  parts.push(jpegBytes);
  push('\nendstream\nendobj\n');
  push('7 0 obj\n<< /Length 10 >>\nstream\nBT ET     \nendstream\nendobj\n');
  push('trailer\n<< /Root 1 0 R >>\n%%EOF');

  return Buffer.concat(parts);
}

const pdf = buildFakePdf();
const result = extractPdfImages(pdf);

assert.strictEqual(result.images.length, 1, 'Phai trich duoc dung 1 anh JPEG nhung trong PDF gia lap');
assert(result.images[0].startsWith('data:image/jpeg;base64,'), 'Anh phai o dang data URL JPEG');

const decoded = Buffer.from(result.images[0].split(',')[1], 'base64');
assert.strictEqual(decoded[0], 0xff, 'Byte dau phai la SOI marker cua JPEG (0xFF)');
assert.strictEqual(decoded[1], 0xd8, 'Byte thu 2 phai la SOI marker cua JPEG (0xD8)');
assert.strictEqual(decoded[decoded.length - 1], 0xd9, 'Byte cuoi phai la EOI marker cua JPEG (0xD9)');

// Anh phai duoc gan dung vao trang thu 2 (index 1, 0-based), khong phai trang 1
assert.deepStrictEqual(result.pageImageMap[0], undefined, 'Trang 1 khong co anh nao, khong duoc gan nham');
assert.deepStrictEqual(result.pageImageMap[1], [0], 'Anh phai duoc gan dung vao trang 2 (index 1)');

// PDF khong co anh nao / hoac loi cau truc -> khong duoc crash, phai tra ve rong an toan
const empty = extractPdfImages(Buffer.from('%PDF-1.4\nkhong phai PDF hop le gi ca', 'latin1'));
assert.deepStrictEqual(empty, { images: [], pageImageMap: {} });

console.log('pdfImageExtractor tests passed');
