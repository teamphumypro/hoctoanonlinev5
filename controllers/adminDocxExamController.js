// Import de thi truc tiep tu file Word (.docx) - huong Azota: doc-hieu va tai tao lai noi dung
// cau hoi + cong thuc. Tu ban V4, toan bo logic nam trong services/exam-import/ (kien truc module
// doc lap: readers/extractors/analyzers/render/validator), goi qua 1 diem vao duy nhat
// ExamImportEngine.import(file) - xem services/exam-import/core/ImportEngine.js.
const fs = require('fs');
const Quiz = require('../models/Quiz');
const ExamImportEngine = require('../services/exam-import/core/ImportEngine');

exports.uploadForm = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  res.render('admin/quizzes/docx-import-upload', { quiz, error: null });
};

exports.upload = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');

  if (!req.file) {
    return res.render('admin/quizzes/docx-import-upload', { quiz, error: 'Vui lòng chọn 1 file Word (.docx) đề thi.' });
  }

  try {
    const exam = await ExamImportEngine.import(req.file.path);
    fs.unlink(req.file.path, () => {});

    res.render('admin/quizzes/docx-import-review', {
      quiz,
      questions: exam.questions,
      error: exam.questions.length === 0 ? 'Không tự động nhận diện được câu hỏi nào. Kiểm tra lại file có đúng định dạng "Câu 1. ... A. ... B. ..." hay không.' : null
    });
  } catch (err) {
    console.error('Loi doc file Word de thi:', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.render('admin/quizzes/docx-import-upload', { quiz, error: 'Không đọc được file: ' + err.message });
  }
};

exports.save = async (req, res) => {
  const { quiz_id, redirect_to } = req.body;
  const rows = req.body.questions ? Object.values(req.body.questions) : [];

  let position = 0;
  for (const row of rows) {
    if (row.include !== 'on') continue;
    const points = parseFloat(row.points) || 0.25;
    const question = row.stem || `Câu ${row.number || (position + 1)}`;
    position++;

    if (row.type === 'single_choice') {
      const options = Array.isArray(row.option_text) ? row.option_text : Object.values(row.option_text || {});
      const correctIndex = parseInt(row.correct_index);
      await Quiz.addSingleChoiceQuestion({
        quiz_id, question, points, options,
        correctIndex: isNaN(correctIndex) ? 0 : correctIndex,
        explanation: (row.explanation || '').trim() || null,
        position
      });
    } else if (row.type === 'true_false') {
      const items = Array.isArray(row.item_text) ? row.item_text : Object.values(row.item_text || {});
      const corrects = row.tf_correct || [];
      await Quiz.addTrueFalseQuestion({
        quiz_id, question, points,
        items: items.map((content, i) => ({ content, is_correct: corrects.includes(String(i)) })),
        explanation: (row.explanation || '').trim() || null,
        position
      });
    } else if (row.type === 'short_answer') {
      await Quiz.addShortAnswerQuestion({
        quiz_id, question, points, correct_answer: row.correct_answer || '',
        explanation: (row.explanation || '').trim() || null,
        position
      });
    } else if (row.type === 'essay') {
      await Quiz.addEssayQuestion({
        quiz_id, question, points,
        explanation: (row.explanation || '').trim() || null,
        position
      });
    }
  }

  res.redirect(redirect_to || `/admin/bai-kiem-tra/${quiz_id}/cau-hoi`);
};
