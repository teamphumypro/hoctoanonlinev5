const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');

// Trang quan ly bai kiem tra cua 1 bai hoc: tao bai KT (neu chua co) + them cau hoi
exports.manage = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.redirect('/admin/khoa-hoc');
  let quiz = await Quiz.findByLesson(lesson.id);
  let questions = [];
  if (quiz) questions = await Quiz.fullQuestions(quiz.id);
  res.render('admin/quizzes/manage', { lesson, quiz, questions, totalPoints: Quiz.totalPoints(questions) });
};

exports.create = async (req, res) => {
  const { lesson_id, title, pass_score } = req.body;
  await Quiz.create({ lesson_id, title, pass_score });
  res.redirect(`/admin/bai-hoc/${lesson_id}/bai-kiem-tra`);
};

exports.delete = async (req, res) => {
  await Quiz.delete(req.params.id);
  res.redirect(`/admin/bai-hoc/${req.body.lesson_id}/bai-kiem-tra`);
};

// Them 1 cau hoi - dang cau hoi (type) quyet dinh xu ly du lieu nao
exports.addQuestion = async (req, res) => {
  const { quiz_id, question, lesson_id, type, points } = req.body;
  const p = parseFloat(points) || 0.25;

  if (type === 'single_choice') {
    const options = req.body.options || [];
    const correctIndex = parseInt(req.body.correct_index);
    await Quiz.addSingleChoiceQuestion({ quiz_id, question, points: p, options, correctIndex });

  } else if (type === 'true_false') {
    const contents = req.body.tf_content || [];
    const corrects = req.body.tf_correct || []; // gom cac index duoc tick la "Dung"
    const items = contents.map((content, i) => ({ content, is_correct: corrects.includes(String(i)) }));
    await Quiz.addTrueFalseQuestion({ quiz_id, question, points: p, items });

  } else if (type === 'short_answer') {
    await Quiz.addShortAnswerQuestion({ quiz_id, question, points: p, correct_answer: req.body.correct_answer });

  } else if (type === 'essay') {
    await Quiz.addEssayQuestion({ quiz_id, question, points: p });
  }

  res.redirect(`/admin/bai-hoc/${lesson_id}/bai-kiem-tra`);
};

exports.deleteQuestion = async (req, res) => {
  await Quiz.deleteQuestion(req.params.id);
  res.redirect(`/admin/bai-hoc/${req.body.lesson_id}/bai-kiem-tra`);
};

// Bang diem: xem toan bo luot lam bai cua hoc vien + danh sach cau tu luan can cham tay
exports.results = async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) return res.redirect('/admin/khoa-hoc');
  const attempts = await Quiz.attemptsByQuiz(quiz.id);
  const pending = await Quiz.pendingManualGrading(quiz.id);
  res.render('admin/quizzes/results', { quiz, attempts, pending });
};

// Cham diem 1 cau tu luan/tra loi ngan can cham tay
exports.gradeManual = async (req, res) => {
  const { answer_id, points, quiz_id } = req.body;
  await Quiz.gradeManualAnswer(answer_id, parseFloat(points) || 0, req.session.adminUser.id);
  res.redirect(`/admin/bai-kiem-tra/${quiz_id}/ket-qua`);
};
