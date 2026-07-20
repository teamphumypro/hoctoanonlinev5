// Import de thi kieu PDF sach lat - THAY THE HOAN TOAN cach cu (upload Word/PDF -> doc-hieu-tach
// lai noi dung). Cach moi: chi luu FILE PDF GOC (hoc sinh xem nguyen trang qua pdf.js), va tu dong
// nhan dien 1 lop metadata nhe (cau N o trang may, may phuong an, dap an dung) de giao vien duyet/
// sua truoc khi luu. Xem services/examImport/pdfAutoDetect.js de biet chi tiet cach nhan dien.
const fs = require('fs');
const path = require('path');
const Quiz = require('../models/Quiz');
const { extractPdfPageTexts } = require('../services/examImport/pdfPageText');
const { detectExamStructure } = require('../services/examImport/pdfAutoDetect');

exports.uploadForm = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  res.render('admin/quizzes/pdf-import-upload', { quiz, error: null });
};

exports.upload = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');

  if (!req.file) {
    return res.render('admin/quizzes/pdf-import-upload', { quiz, error: 'Vui lòng chọn 1 file PDF đề thi.' });
  }

  try {
    const pageTexts = await extractPdfPageTexts(req.file.path);
    if (pageTexts.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.render('admin/quizzes/pdf-import-upload', {
        quiz, error: 'Không đọc được trang nào từ file PDF này. Có thể file bị lỗi hoặc là PDF dạng ảnh scan (chưa hỗ trợ nhận dạng chữ trong ảnh).'
      });
    }

    const rows = detectExamStructure(pageTexts);

    // Duong dan luu tam trong session-less flow: giu nguyen file da upload (khong xoa nhu cach
    // cu), vi chinh file PDF nay se la noi dung de thi hien thi cho hoc sinh sau khi luu.
    const relativePath = '/uploads/exam-imports/' + path.basename(req.file.path);

    res.render('admin/quizzes/pdf-import-review', {
      quiz,
      rows,
      totalPages: pageTexts.length,
      pdfPath: relativePath,
      tempFilePath: req.file.path,
      error: rows.length === 0 ? 'Không tự động nhận diện được câu hỏi nào. Bạn vẫn có thể tự thêm câu hỏi thủ công ở bảng bên dưới.' : null
    });
  } catch (err) {
    console.error('Loi doc file PDF de thi:', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.render('admin/quizzes/pdf-import-upload', { quiz, error: 'Không đọc được file: ' + err.message });
  }
};

// Luu lai: gan file PDF lam nguon cho de thi + tao cac cau hoi (metadata nhe) tu bang da duyet/sua
exports.save = async (req, res) => {
  const { quiz_id, redirect_to, pdf_path, total_pages, temp_file_path } = req.body;
  const rows = req.body.questions ? Object.values(req.body.questions) : [];

  await Quiz.setPdfSource(quiz_id, pdf_path, parseInt(total_pages) || null);

  let position = 0;
  for (const row of rows) {
    if (row.include !== 'on') continue;
    const page_number = parseInt(row.page) || null;
    const solution_page = parseInt(row.solution_page) || null;
    const points = parseFloat(row.points) || 0.25;
    // Noi dung cau chi con la nhan ngan gon de quan tri/tra cuu - noi dung that hoc sinh thay la
    // chinh trang PDF (page_number). Khong con can tach/giu cong thuc trong truong nay nua.
    const question = `Câu ${row.number || (position + 1)} (trang ${page_number || '?'})`;
    position++;

    if (row.type === 'single_choice') {
      const optionCount = Math.max(2, parseInt(row.option_count) || 4);
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const options = letters.slice(0, optionCount);
      const correctIndex = parseInt(row.correct_index);
      await Quiz.addSingleChoiceQuestion({
        quiz_id, question, points, options,
        correctIndex: isNaN(correctIndex) ? 0 : correctIndex,
        explanation: (row.explanation || '').trim() || null,
        position, page_number, solution_page
      });
    } else if (row.type === 'true_false') {
      const itemCount = Math.max(2, parseInt(row.option_count) || 4);
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const corrects = row.tf_correct || [];
      const items = letters.slice(0, itemCount).map((l, i) => ({ content: l, is_correct: corrects.includes(String(i)) }));
      await Quiz.addTrueFalseQuestion({
        quiz_id, question, points, items,
        explanation: (row.explanation || '').trim() || null,
        position, page_number, solution_page
      });
    } else if (row.type === 'short_answer') {
      await Quiz.addShortAnswerQuestion({
        quiz_id, question, points, correct_answer: row.correct_answer || '',
        explanation: (row.explanation || '').trim() || null,
        position, page_number, solution_page
      });
    } else if (row.type === 'essay') {
      await Quiz.addEssayQuestion({
        quiz_id, question, points,
        explanation: (row.explanation || '').trim() || null,
        position, page_number, solution_page
      });
    }
  }

  res.redirect(redirect_to || `/admin/bai-kiem-tra/${quiz_id}/cau-hoi`);
};
