const fs = require('fs');
const Quiz = require('../models/Quiz');
const Settings = require('../models/Settings');
const { downloadFromDriveLink } = require('../services/examImport/extractText');
const { importExam, renderer } = require('../services/exam-ast');
const { parseWithAI } = require('../services/ai/examAiParser');

// Dung chung cho ca 2 truong hop: de gan voi 1 bai hoc (co lesson) hoac de doc lap trong Thuc chien phong thi
exports.uploadForm = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  const config = await Settings.getAll();
  res.render('admin/quizzes/import-upload', { quiz, aiConfigured: !!(config.ai_api_key && config.ai_api_key.trim()), error: null });
};

exports.upload = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin');
  const config = await Settings.getAll();
  let filePath = null;
  try {
    if (req.file) filePath = req.file.path;
    else if (req.body.drive_link && req.body.drive_link.trim()) {
      const uploadDir = require('path').join(__dirname, '..', 'public', 'uploads', 'exam-imports');
      filePath = await downloadFromDriveLink(req.body.drive_link.trim(), uploadDir);
    } else {
      return res.render('admin/quizzes/import-upload', { quiz, aiConfigured: false, error: 'Vui lòng chọn file DOCX/PDF hoặc dán link Google Drive.' });
    }

    const document = await importExam(filePath);
    fs.unlink(filePath, () => {});
    if (!document.questions || !document.questions.length) throw new Error('Không nhận diện được câu hỏi trong tài liệu');

    const questions = document.questions.map(q => {
      const answerLetter = typeof q.answer === 'string' && /^[A-H]$/i.test(q.answer) ? q.answer.toUpperCase() : '';
      const labels = Array.isArray(q.labels) && q.labels.length ? q.labels : (q.rawOptions || []).map((_, i) => String.fromCharCode(65 + i));
      const correctIndex = answerLetter ? labels.indexOf(answerLetter) : 0;
      const questionHtml = renderer.renderBlocks(q.questionAst);
      const optionHtml = (q.optionAsts || []).map(renderer.renderBlocks);
      const solutionHtml = renderer.renderBlocks(q.solutionAst);
      return {
        ...q,
        labels,
        questionHtml,
        optionHtml,
        solutionHtml,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        items: q.type === 'true_false' ? (q.rawOptions || []).map((content, i) => ({ content, is_correct: Array.isArray(q.answer) ? q.answer[i] === true : false })) : [],
        correct_answer: q.type === 'short_answer' ? String(q.answer || '') : '',
        needsReview: (q.warnings || []).length > 0,
        astJson: JSON.stringify({ version: 1, question: q.questionAst, options: q.optionAsts, solution: q.solutionAst })
      };
    });

    res.render('admin/quizzes/import-review', { quiz, questions, document, usedAI: false, aiError: null });
  } catch (err) {
    console.error('Loi import de thi:', err);
    if (filePath) fs.unlink(filePath, () => {});
    res.render('admin/quizzes/import-upload', { quiz, aiConfigured: false, error: 'Không đọc được file: ' + err.message });
  }
};

// Luu cac cau hoi da duoc xem/sua tren man hinh review vao database
exports.save = async (req, res) => {
  const { quiz_id, redirect_to } = req.body;
  const rows = req.body.questions ? Object.values(req.body.questions) : [];

  for (const row of rows) {
    if (row.include !== 'on') continue;
    const points = parseFloat(row.points) || 0.25;
    const question = (row.question || '').trim();
    if (!question) continue;
    const explanation = (row.explanation || '').trim() || null;
    let ast_json = null;
    try { ast_json = row.ast_json ? JSON.parse(row.ast_json) : null; } catch (_) {}
    let rubric = [];
    try { rubric = row.rubric_json ? JSON.parse(row.rubric_json) : []; } catch (_) {}

    if (row.type === 'single_choice') {
      const options = row.options || [];
      const correctIndex = parseInt(row.correct_index);
      await Quiz.addSingleChoiceQuestion({ quiz_id, question, points, options, correctIndex: isNaN(correctIndex) ? 0 : correctIndex, explanation, ast_json, rubric });

    } else if (row.type === 'true_false') {
      const contents = row.tf_content || [];
      const corrects = row.tf_correct || [];
      const items = contents.map((content, i) => ({ content, is_correct: corrects.includes(String(i)) }));
      await Quiz.addTrueFalseQuestion({ quiz_id, question, points, items, explanation, ast_json, rubric });

    } else if (row.type === 'short_answer') {
      await Quiz.addShortAnswerQuestion({ quiz_id, question, points, correct_answer: row.correct_answer || '', explanation, ast_json, rubric });

    } else if (row.type === 'essay') {
      await Quiz.addEssayQuestion({ quiz_id, question, points, explanation, ast_json, rubric });
    }
  }

  res.redirect(redirect_to || `/admin/bai-kiem-tra/${quiz_id}/cau-hoi`);
};
