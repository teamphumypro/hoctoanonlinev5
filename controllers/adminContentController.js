// Quan ly Chuong / Bai / Video / File (dinh kem trong trang "Noi dung khoa hoc")
const Chapter = require('../models/Chapter');
const Lesson = require('../models/Lesson');
const LessonVideo = require('../models/LessonVideo');
const LessonFile = require('../models/LessonFile');

// ---- Chuong ----
exports.createChapter = async (req, res) => {
  const { course_id, title } = req.body;
  await Chapter.create({ course_id, title });
  res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
};
exports.updateChapter = async (req, res) => {
  await Chapter.update(req.params.id, { title: req.body.title });
  res.redirect(`/admin/khoa-hoc/${req.body.course_id}/noi-dung`);
};
exports.deleteChapter = async (req, res) => {
  await Chapter.delete(req.params.id);
  res.redirect(`/admin/khoa-hoc/${req.body.course_id}/noi-dung`);
};
exports.reorderChapters = async (req, res) => {
  await Chapter.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- Bai hoc ----
exports.createLesson = async (req, res) => {
  const { chapter_id, title, content, is_preview, course_id } = req.body;
  await Lesson.create({ chapter_id, title, content, is_preview: is_preview === 'on' });
  res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
};
exports.updateLesson = async (req, res) => {
  const { title, content, is_preview, course_id } = req.body;
  await Lesson.update(req.params.id, { title, content, is_preview: is_preview === 'on' });
  res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
};
exports.deleteLesson = async (req, res) => {
  await Lesson.delete(req.params.id);
  res.redirect(`/admin/khoa-hoc/${req.body.course_id}/noi-dung`);
};
exports.reorderLessons = async (req, res) => {
  await Lesson.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- Video: youtube/vimeo/upload/drive ----
function extractYoutubeId(input) {
  const m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : input.trim();
}
function extractVimeoId(input) {
  const m = input.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : input.trim();
}

exports.createVideo = async (req, res) => {
  const { lesson_id, title, source_type, source_value, course_id } = req.body;
  let value = source_value;
  if (source_type === 'youtube') value = extractYoutubeId(source_value);
  if (source_type === 'vimeo') value = extractVimeoId(source_value);
  if (source_type === 'upload' && req.file) value = '/uploads/videos/' + req.file.filename;
  // drive: gia tri la link chia se Google Drive nguyen ban (chuyen sang dang /preview khi hien thi)

  await LessonVideo.create({ lesson_id, title, source_type, source_value: value });
  res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
};
exports.deleteVideo = async (req, res) => {
  await LessonVideo.delete(req.params.id);
  res.redirect(`/admin/khoa-hoc/${req.body.course_id}/noi-dung`);
};
exports.reorderVideos = async (req, res) => {
  await LessonVideo.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- File / PDF dinh kem ----
exports.createFile = async (req, res) => {
  const { lesson_id, title, course_id } = req.body;
  if (!req.file) return res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
  const file_url = '/uploads/files/' + req.file.filename;
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  await LessonFile.create({ lesson_id, title, file_url, file_type: ext });
  res.redirect(`/admin/khoa-hoc/${course_id}/noi-dung`);
};
exports.deleteFile = async (req, res) => {
  await LessonFile.delete(req.params.id);
  res.redirect(`/admin/khoa-hoc/${req.body.course_id}/noi-dung`);
};
