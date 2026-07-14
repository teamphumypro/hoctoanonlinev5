const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// Trang lam bai kiem tra
exports.take = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).render('404');

  const enrolled = await Enrollment.isEnrolled(req.session.user.id, quiz.course_id);
  if (!enrolled) return res.status(403).render('403', { user: req.session.user });

  const questions = await Quiz.fullQuestions(quiz.id);
  const bestAttempt = await Quiz.bestAttempt(quiz.id, req.session.user.id);
  res.render('quiz-take', { quiz, questions, bestAttempt, totalPoints: Quiz.totalPoints(questions) });
};

// Nop bai -> cham diem tu dong cac cau trac nghiem/dung-sai/tra loi ngan,
// rieng cau tu luan luu lai cho giao vien cham tay sau
exports.submit = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).render('404');

  const enrolled = await Enrollment.isEnrolled(req.session.user.id, quiz.course_id);
  if (!enrolled) return res.status(403).render('403', { user: req.session.user });

  // Dung nap du lieu tu form: cau trac nghiem/tra loi ngan gui answers[qid],
  // cau dung-sai gui answers_tf[qid][itemId], cau tu luan gui essay[qid]
  const answers = {};
  Object.entries(req.body.answers || {}).forEach(([qid, val]) => { answers[qid] = val; });
  Object.entries(req.body.answers_tf || {}).forEach(([qid, val]) => { answers[qid] = val; });
  Object.entries(req.body.essay || {}).forEach(([qid, val]) => { answers[qid] = val; });

  const result = await Quiz.grade(quiz.id, answers);
  const attempt = await Quiz.recordAttempt({
    quiz_id: quiz.id, user_id: req.session.user.id,
    score: result.score, total: result.total, passed: result.passed
  });

  // Luu lai tung cau tra loi (de admin xem lai / cham tay cau tu luan)
  for (const d of result.details) {
    await Quiz.saveAttemptAnswer({
      attempt_id: attempt.id,
      question_id: d.questionId,
      answer_text: d.type === 'essay' ? (d.yourAnswer || '') : JSON.stringify(answers[d.questionId] ?? ''),
      awarded_points: d.earned,
      needs_manual_grading: !!d.needsManualGrading
    });
  }

  if (result.passed) {
    await User.addPoints(req.session.user.id, 10);
  }

  res.render('quiz-result', { quiz, result });
};
