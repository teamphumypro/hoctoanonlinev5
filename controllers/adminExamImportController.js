const fs = require('fs');
const path = require('path');
const Quiz = require('../models/Quiz');
const { parsePdfExam } = require('../services/examImport/pdfExamParser');

exports.uploadForm = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  res.render('admin/quizzes/import-upload', { quiz, error: null });
};

exports.upload = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  if (!req.file) return res.render('admin/quizzes/import-upload', { quiz, error: 'Vui lòng chọn một file PDF.' });

  const filePath = req.file.path;
  try {
    if (path.extname(req.file.originalname).toLowerCase() !== '.pdf') {
      throw new Error('Phiên bản mới chỉ nhận file PDF để giữ nguyên 100% bố cục đề thi.');
    }
    const parsed = await parsePdfExam(filePath);
    const pdfBuffer = fs.readFileSync(filePath);
    await Quiz.savePdfDocument(quiz.id, { pdfBuffer, filename: req.file.originalname });
    fs.unlink(filePath, () => {});
    res.render('admin/quizzes/pdf-import-review', {
      quiz,
      parsed,
      originalName: req.file.originalname
    });
  } catch (err) {
    fs.unlink(filePath, () => {});
    console.error('Lỗi xử lý đề PDF:', err);
    res.render('admin/quizzes/import-upload', { quiz, error: 'Không xử lý được file PDF: ' + err.message });
  }
};

exports.save = async (req, res) => {
  const quizId = Number(req.body.quiz_id);
  const rows = req.body.questions ? Object.values(req.body.questions) : [];
  const questions = rows
    .filter(r => r.include === 'on')
    .map((r, index) => ({
      displayNumber: String(r.display_number || index + 1),
      page: Math.max(1, Number(r.page) || 1),
      type: r.type || 'single_choice',
      points: Number(r.points) || 0.25,
      optionCount: Number(r.option_count) || (r.type === 'true_false' ? 4 : 4),
      answer: String(r.answer || '').trim(),
      sectionTitle: String(r.section_title || '')
    }));

  const questionMap = questions.map((q, i) => ({ index: i, number: q.displayNumber, page: q.page, type: q.type }));
  await Quiz.replaceWithPdfExam(quizId, {
    pdfBuffer: null,
    filename: req.body.original_name || `de-thi-${quizId}.pdf`,
    pageCount: Number(req.body.page_count) || 1,
    questionMap,
    questions
  });
  res.redirect(`/admin/bai-kiem-tra/${quizId}/cau-hoi`);
};
