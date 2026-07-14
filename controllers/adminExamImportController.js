const fs = require('fs');
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const Settings = require('../models/Settings');
const { extractText } = require('../services/examImport/extractText');
const { parseExamText } = require('../services/examImport/regexParser');
const { parseWithAI } = require('../services/ai/examAiParser');

exports.uploadForm = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.redirect('/admin/khoa-hoc');
  const quiz = await Quiz.findByLesson(lesson.id);
  if (!quiz) return res.redirect(`/admin/bai-hoc/${lesson.id}/bai-kiem-tra`);
  const config = await Settings.getAll();
  res.render('admin/quizzes/import-upload', { lesson, quiz, aiConfigured: !!(config.ai_api_key && config.ai_api_key.trim()), error: null });
};

exports.upload = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  const quiz = await Quiz.findByLesson(lesson.id);
  const config = await Settings.getAll();

  if (!req.file) {
    return res.render('admin/quizzes/import-upload', { lesson, quiz, aiConfigured: !!(config.ai_api_key || '').trim(), error: 'Vui lòng chọn file Word (.docx) hoặc PDF.' });
  }

  try {
    const rawText = await extractText(req.file.path);
    fs.unlink(req.file.path, () => {}); // xoa file tam ngay sau khi doc xong, khong luu lai

    if (!rawText || rawText.trim().length < 20) {
      return res.render('admin/quizzes/import-upload', {
        lesson, quiz, aiConfigured: !!(config.ai_api_key || '').trim(),
        error: 'Không đọc được nội dung chữ nào từ file này. Có thể đây là file scan dạng ảnh, hoặc file bị lỗi.'
      });
    }

    let questions = [];
    let usedAI = false;
    let aiError = null;
    const wantAI = req.body.use_ai === 'on' && (config.ai_api_key || '').trim();

    if (wantAI) {
      try {
        questions = await parseWithAI(rawText, config);
        usedAI = true;
      } catch (err) {
        console.error('Loi AI parse de thi:', err.message);
        aiError = err.message;
        questions = parseExamText(rawText); // du phong bang regex neu AI loi
      }
    } else {
      questions = parseExamText(rawText);
    }

    res.render('admin/quizzes/import-review', { lesson, quiz, questions, usedAI, aiError, rawTextPreview: rawText.slice(0, 500) });
  } catch (err) {
    console.error('Loi doc file de thi:', err);
    const config2 = await Settings.getAll();
    res.render('admin/quizzes/import-upload', {
      lesson, quiz, aiConfigured: !!(config2.ai_api_key || '').trim(),
      error: 'Không đọc được file: ' + err.message
    });
  }
};

// Luu cac cau hoi da duoc xem/sua tren man hinh review vao database
exports.save = async (req, res) => {
  const { lesson_id, quiz_id } = req.body;
  const rows = req.body.questions ? Object.values(req.body.questions) : [];

  for (const row of rows) {
    if (row.include !== 'on') continue;
    const points = parseFloat(row.points) || 0.25;
    const question = (row.question || '').trim();
    if (!question) continue;

    if (row.type === 'single_choice') {
      const options = row.options || [];
      const correctIndex = parseInt(row.correct_index);
      await Quiz.addSingleChoiceQuestion({ quiz_id, question, points, options, correctIndex: isNaN(correctIndex) ? 0 : correctIndex });

    } else if (row.type === 'true_false') {
      const contents = row.tf_content || [];
      const corrects = row.tf_correct || [];
      const items = contents.map((content, i) => ({ content, is_correct: corrects.includes(String(i)) }));
      await Quiz.addTrueFalseQuestion({ quiz_id, question, points, items });

    } else if (row.type === 'short_answer') {
      await Quiz.addShortAnswerQuestion({ quiz_id, question, points, correct_answer: row.correct_answer || '' });

    } else if (row.type === 'essay') {
      await Quiz.addEssayQuestion({ quiz_id, question, points });
    }
  }

  res.redirect(`/admin/bai-hoc/${lesson_id}/bai-kiem-tra`);
};
