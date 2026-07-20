const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// Trang lam bai kiem tra
exports.take = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).render('404');

  if (quiz.lesson_id) {
    const enrolled = await Enrollment.isEnrolled(req.session.user.id, quiz.course_id);
    if (!enrolled) return res.status(403).render('403', { user: req.session.user });
  } else if (quiz.visibility === 'assigned') {
    // De duoc giao rieng: chi hoc vien duoc giao moi vao lam duoc
    const assignment = await Quiz.isAssignedTo(quiz.id, req.session.user.id);
    if (!assignment) return res.status(403).render('403', { user: req.session.user });
  }
  // De thi cong khai (Thuc chien phong thi): chi can dang nhap la lam duoc

  let questions = await Quiz.fullQuestions(quiz.id);
  questions = Quiz.shuffleForAttempt(questions, quiz);
  const bestAttempt = await Quiz.bestAttempt(quiz.id, req.session.user.id);

  // Neu bai co gioi han thoi gian, ghi/lay lai thoi diem bat dau de dem nguoc chinh xac (chong reset gio khi tai lai trang)
  let quizStart = null;
  if (quiz.time_limit_minutes) quizStart = await Quiz.getOrCreateStart(quiz.id, req.session.user.id);

  // De dang PDF sach lat (import theo cach moi): hien flipbook + bang tra loi dong bo theo trang,
  // thay vi render toan bo noi dung cau server-side nhu truoc.
  if (quiz.pdf_source_path) {
    // QUAN TRONG: JSON nay se duoc nhung thang vao trang (client can de dung bang tra loi dong theo
    // trang) - PHAI loc bo moi truong chua dap an dung truoc khi gui, neu khong hoc sinh co the xem
    // View Source la thay dap an. Khac voi view cu (render server-side, khong bao gio lo).
    const clientQuestions = questions.map((q, qi) => ({
      id: q.id,
      displayNumber: qi + 1,
      type: q.type,
      points: q.points,
      page_number: q.page_number,
      optionCount: q.type === 'single_choice' ? (q.options || []).length : (q.type === 'true_false' ? (q.tfItems || []).length : 0),
      options: q.type === 'single_choice' ? (q.options || []).map(o => ({ id: o.id })) : undefined,
      tfItems: q.type === 'true_false' ? (q.tfItems || []).map(it => ({ id: it.id })) : undefined
    }));
    return res.render('quiz-take-pdf', { quiz, questions: clientQuestions, bestAttempt, totalPoints: Quiz.totalPoints(questions), quizStart });
  }

  res.render('quiz-take', { quiz, questions, bestAttempt, totalPoints: Quiz.totalPoints(questions), quizStart });
};

// Nop bai -> cham diem tu dong cac cau trac nghiem/dung-sai/tra loi ngan,
// rieng cau tu luan luu lai cho giao vien cham tay sau
exports.submit = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).render('404');

  if (quiz.lesson_id) {
    const enrolled = await Enrollment.isEnrolled(req.session.user.id, quiz.course_id);
    if (!enrolled) return res.status(403).render('403', { user: req.session.user });
  } else if (quiz.visibility === 'assigned') {
    const assignment = await Quiz.isAssignedTo(quiz.id, req.session.user.id);
    if (!assignment) return res.status(403).render('403', { user: req.session.user });
  }

  // Tinh thoi gian thuc lam bai (neu bai co dem gio) tu thoi diem bat dau da ghi lai
  let duration_seconds = null;
  if (quiz.time_limit_minutes) {
    const start = await Quiz.getOrCreateStart(quiz.id, req.session.user.id);
    duration_seconds = Math.round((Date.now() - new Date(start.started_at).getTime()) / 1000);
    await Quiz.clearStart(quiz.id, req.session.user.id);
  }

  // Dung nap du lieu tu form: cau trac nghiem/tra loi ngan gui answers[qid],
  // cau dung-sai gui answers_tf[qid][itemId], cau tu luan gui essay[qid]
  const answers = {};
  Object.entries(req.body.answers || {}).forEach(([qid, val]) => { answers[qid] = val; });
  Object.entries(req.body.answers_tf || {}).forEach(([qid, val]) => { answers[qid] = val; });
  Object.entries(req.body.essay || {}).forEach(([qid, val]) => { answers[qid] = val; });

  const result = await Quiz.grade(quiz.id, answers);
  const attempt = await Quiz.recordAttempt({
    quiz_id: quiz.id, user_id: req.session.user.id,
    score: result.score, total: result.total, passed: result.passed, duration_seconds
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

// Bang xep hang cua 1 de thi (kieu EduQuiz) - diem cao nhat cua tung hoc vien, uu tien lam nhanh khi bang diem
exports.leaderboard = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).render('404');
  const ranking = await Quiz.leaderboard(quiz.id);
  res.render('quiz-leaderboard', { quiz, ranking });
};

// "Bai duoc giao" - danh sach de thi duoc giao rieng kem han nop cho hoc vien dang nhap
exports.myAssignments = async (req, res) => {
  const assignments = await Quiz.myAssignments(req.session.user.id);
  res.render('student/my-assignments', { assignments });
};
