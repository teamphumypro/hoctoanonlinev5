// Kiem tra cac phan mem he thong (khong phai npm package) can cho viec hien thi dung
// cong thuc MathType/WMF (LibreOffice), doc PDF scan (Poppler) va OCR anh (Tesseract).
// Neu server dang chay bang moi truong Node thuong (khong dung Dockerfile di kem) thi
// cac lenh nay se KHONG co, va cong thuc se roi vao nhanh du phong hien chu canh bao
// "[cong thuc - chua hien thi duoc, vui long sua tay]" thay vi anh that.
// Cache ket qua trong bo nho vi day la lenh he thong, khong doi trong suot vong doi server.
const { execFileSync } = require('child_process');

let cached = null;

function commandExists(cmd) {
  try {
    // "which" co san tren moi image Linux (kem ca node:20-slim va cac buildpack Node thuong)
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function checkSystemDependencies() {
  if (cached) return cached;
  cached = {
    soffice: commandExists('soffice'),       // LibreOffice - bat buoc de hien cong thuc MathType/WMF thanh anh
    pdftoppm: commandExists('pdftoppm'),      // Poppler - bat buoc de doc PDF scan (chuyen trang PDF sang anh)
  };
  return cached;
}

module.exports = { checkSystemDependencies };
