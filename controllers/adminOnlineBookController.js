const OnlineBook = require('../models/OnlineBook');
const OnlineBookChapter = require('../models/OnlineBookChapter');
const { makeSlug } = require('../utils');
const fs = require('fs');

exports.list = async (req, res) => {
  const books = await OnlineBook.all();
  res.render('admin/online-books/list', { books });
};

exports.newForm = (req, res) => res.render('admin/online-books/form', { book: null });

// Lay file_url/file_source tu form: uu tien file PDF vua upload, sau do toi link dan tay
function resolveFileField(req) {
  const uploadedBookFile = req.files && req.files.book_file && req.files.book_file[0];
  if (uploadedBookFile) return { file_url: '/uploads/online-books/' + uploadedBookFile.filename, file_source: 'upload' };
  const link = (req.body.book_file_link || '').trim();
  if (link) return { file_url: link, file_source: 'link' };
  return { file_url: null, file_source: null };
}

exports.create = async (req, res) => {
  const { title, author, short_desc, description, price, compare_at_price, is_published, cover_url_link } = req.body;
  const uploadedCover = req.files && req.files.cover && req.files.cover[0];
  const cover_url = uploadedCover ? '/uploads/thumbnails/' + uploadedCover.filename : (cover_url_link || null);
  const { file_url, file_source } = resolveFileField(req);
  const book = await OnlineBook.create({
    title, author, short_desc, description, price, compare_at_price: compare_at_price || null,
    cover_url, is_published: is_published === 'on', slug: makeSlug(title), file_url, file_source
  });
  res.redirect(`/admin/doc-sach-online/${book.id}/sua`);
};

exports.editForm = async (req, res) => {
  const book = await OnlineBook.findById(req.params.id);
  if (!book) return res.redirect('/admin/doc-sach-online');
  res.render('admin/online-books/form', { book });
};

exports.update = async (req, res) => {
  const { title, author, short_desc, description, price, compare_at_price, is_published, cover_url_link } = req.body;
  const uploadedCover = req.files && req.files.cover && req.files.cover[0];
  const cover_url = uploadedCover ? '/uploads/thumbnails/' + uploadedCover.filename : (cover_url_link || null);
  const { file_url, file_source } = resolveFileField(req);
  await OnlineBook.update(req.params.id, {
    title, author, short_desc, description, price, compare_at_price: compare_at_price || null,
    cover_url, is_published: is_published === 'on', file_url, file_source
  });
  res.redirect('/admin/doc-sach-online');
};

exports.delete = async (req, res) => {
  await OnlineBook.delete(req.params.id);
  res.redirect('/admin/doc-sach-online');
};

// ---- Quan ly chuong ----
exports.chapters = async (req, res) => {
  const book = await OnlineBook.findById(req.params.id);
  if (!book) return res.redirect('/admin/doc-sach-online');
  const chapters = await OnlineBookChapter.byBook(book.id);
  res.render('admin/online-books/chapters', { book, chapters });
};

exports.chapterCreate = async (req, res) => {
  const { online_book_id, title, content, is_free } = req.body;
  await OnlineBookChapter.create({ online_book_id, title, content, is_free: is_free === 'on' });
  res.redirect(`/admin/doc-sach-online/${online_book_id}/chuong`);
};

exports.chapterEditForm = async (req, res) => {
  const chapter = await OnlineBookChapter.findById(req.params.id);
  if (!chapter) return res.redirect('/admin/doc-sach-online');
  const book = await OnlineBook.findById(chapter.online_book_id);
  res.render('admin/online-books/chapter-form', { chapter, book });
};

exports.chapterUpdate = async (req, res) => {
  const { title, content, is_free, online_book_id } = req.body;
  await OnlineBookChapter.update(req.params.id, { title, content, is_free: is_free === 'on' });
  res.redirect(`/admin/doc-sach-online/${online_book_id}/chuong`);
};

exports.chapterDelete = async (req, res) => {
  await OnlineBookChapter.delete(req.params.id);
  res.redirect(`/admin/doc-sach-online/${req.body.online_book_id}/chuong`);
};

exports.chapterReorder = async (req, res) => {
  await OnlineBookChapter.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- Nhap noi dung chuong tu file Word/PDF hoac link Google Drive (tu dong tach chuong) ----
exports.chapterImportForm = async (req, res) => {
  const book = await OnlineBook.findById(req.params.id);
  if (!book) return res.redirect('/admin/doc-sach-online');
  res.render('admin/online-books/chapter-import-upload', { book, error: null });
};

exports.chapterImport = async (req, res) => {
  const book = await OnlineBook.findById(req.params.id);
  if (!book) return res.redirect('/admin/doc-sach-online');
  const { extractText, downloadFromDriveLink } = require('../services/examImport/extractText');
  const { splitIntoChapters } = require('../services/examImport/bookChapterSplitter');

  let filePath = null;
  try {
    if (req.file) {
      filePath = req.file.path;
    } else if (req.body.drive_link && req.body.drive_link.trim()) {
      const uploadDir = require('path').join(__dirname, '..', 'public', 'uploads', 'exam-imports');
      filePath = await downloadFromDriveLink(req.body.drive_link.trim(), uploadDir);
    } else {
      return res.render('admin/online-books/chapter-import-upload', { book, error: 'Vui lòng chọn file .docx/.pdf hoặc dán link Google Drive.' });
    }

    const rawText = await extractText(filePath);
    fs.unlink(filePath, () => {});

    if (!rawText || rawText.trim().length < 20) {
      return res.render('admin/online-books/chapter-import-upload', { book, error: 'Không đọc được nội dung chữ nào từ file này. Có thể đây là file scan dạng ảnh, hoặc file bị lỗi.' });
    }

    const chapters = splitIntoChapters(rawText);
    res.render('admin/online-books/chapter-import-review', { book, chapters });
  } catch (err) {
    console.error('Loi nhap noi dung sach doc online:', err);
    if (filePath) fs.unlink(filePath, () => {});
    res.render('admin/online-books/chapter-import-upload', { book, error: 'Không đọc được file: ' + err.message });
  }
};

exports.chapterImportSave = async (req, res) => {
  const { online_book_id } = req.body;
  const rows = req.body.chapters ? Object.values(req.body.chapters) : [];
  for (const row of rows) {
    if (row.include !== 'on') continue;
    const title = (row.title || '').trim();
    if (!title) continue;
    await OnlineBookChapter.create({ online_book_id, title, content: row.content || '', is_free: row.is_free === 'on' });
  }
  res.redirect(`/admin/doc-sach-online/${online_book_id}/chuong`);
};
