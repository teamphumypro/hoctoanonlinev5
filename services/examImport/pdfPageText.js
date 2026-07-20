// Doc van ban tung trang cua file PDF - CHI dung de tu dong phat hien "cau N o trang nao" va
// doc bang dap an luc GIAO VIEN UPLOAD DE (services/examImport/pdfAutoDetect.js). Khong con trich
// anh/cong thuc gi o day nua - trang PDF that duoc hoc sinh xem truc tiep qua pdf.js o trinh duyet
// (xem views/quiz-take-pdf.ejs), nen khong con rui ro meo/mat noi dung nhu cach doc-hieu-roi-ve-lai
// truoc day.
const fs = require('fs');

async function extractPdfPageTexts(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const pageTexts = [];

  try {
    await pdfParse(buffer, {
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
    console.error('Loi doc van ban tung trang PDF:', err.message);
  }

  return pageTexts;
}

module.exports = { extractPdfPageTexts };
