const Book = require('../models/Book');
const BookType = require('../models/BookType');
const BookCategory = require('../models/BookCategory');
const BookChapter = require('../models/BookChapter');
const { makeSlug } = require('../utils');
const fs = require('fs');

exports.list = async (req, res) => {
  const books = await Book.all();
  res.render('admin/books/list', { books });
};

exports.newForm = async (req, res) => {
  const categories = await BookCategory.tree();
  const bookTypes = await BookType.all();
  res.render('admin/books/form', { book: null, categories, bookTypes });
};

exports.create = async (req, res) => {
  const { title, author, short_desc, description, price, compare_at_price, file_url, preview_url, category_id, book_type_id, is_published, cover_url_link } = req.body;
  const cover_url = req.file ? '/uploads/thumbnails/' + req.file.filename : (cover_url_link || null);
  await Book.create({
    title, author, short_desc, description, price, compare_at_price: compare_at_price || null,
    file_url, preview_url, category_id: category_id || null, book_type_id: book_type_id || null,
    cover_url, is_published: is_published === 'on', slug: makeSlug(title)
  });
  res.redirect('/admin/sach');
};

exports.editForm = async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.redirect('/admin/sach');
  const categories = await BookCategory.tree();
  const bookTypes = await BookType.all();
  res.render('admin/books/form', { book, categories, bookTypes });
};

exports.update = async (req, res) => {
  const { title, author, short_desc, description, price, compare_at_price, file_url, preview_url, category_id, book_type_id, is_published, cover_url_link } = req.body;
  const cover_url = req.file ? '/uploads/thumbnails/' + req.file.filename : (cover_url_link || null);
  await Book.update(req.params.id, {
    title, author, short_desc, description, price, compare_at_price: compare_at_price || null,
    file_url, preview_url, category_id: category_id || null, book_type_id: book_type_id || null,
    cover_url, is_published: is_published === 'on'
  });
  res.redirect('/admin/sach');
};

exports.delete = async (req, res) => {
  await Book.delete(req.params.id);
  res.redirect('/admin/sach');
};

// ---- Quan ly "Loai sach" (Van hoc, Tham khao, Chu de...) ----
exports.bookTypes = async (req, res) => {
  const bookTypes = await BookType.all();
  res.render('admin/books/types', { bookTypes });
};
exports.bookTypeCreate = async (req, res) => {
  await BookType.create({ name: req.body.name, slug: makeSlug(req.body.name) });
  res.redirect('/admin/sach/loai');
};
exports.bookTypeDelete = async (req, res) => {
  await BookType.delete(req.params.id);
  res.redirect('/admin/sach/loai');
};

// ---- Muc rieng: "Doc sach online" - chi liet ke sach da bat tinh nang doc chuong ----
exports.onlineReadingList = async (req, res) => {
  const books = await Book.withChaptersAll();
  res.render('admin/books/online-reading-list', { books });
};

// ---- Quan ly "Danh muc sach" - cay rieng, TACH BIET voi Danh muc Khoa hoc ----
exports.categories = async (req, res) => {
  const tree = await BookCategory.tree();
  res.render('admin/books/categories', { tree });
};
exports.categoryNewForm = async (req, res) => {
  const categories = await BookCategory.all();
  res.render('admin/books/category-form', { category: null, categories });
};
exports.categoryCreate = async (req, res) => {
  const { name, parent_id } = req.body;
  await BookCategory.create({ name, parent_id: parent_id || null, slug: makeSlug(name) });
  res.redirect('/admin/sach/danh-muc');
};
exports.categoryEditForm = async (req, res) => {
  const category = await BookCategory.findById(req.params.id);
  const categories = (await BookCategory.all()).filter(c => c.id != req.params.id);
  res.render('admin/books/category-form', { category, categories });
};
exports.categoryUpdate = async (req, res) => {
  const { name, parent_id } = req.body;
  const existing = await BookCategory.findById(req.params.id);
  await BookCategory.update(req.params.id, { name, parent_id: parent_id || null, slug: existing.slug });
  res.redirect('/admin/sach/danh-muc');
};
exports.categoryDelete = async (req, res) => {
  await BookCategory.delete(req.params.id);
  res.redirect('/admin/sach/danh-muc');
};
exports.categoryReorder = async (req, res) => {
  await BookCategory.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- Quan ly chuong doc online cua 1 cuon sach ----
exports.chapters = async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.redirect('/admin/sach');
  const chapters = await BookChapter.byBook(book.id);
  res.render('admin/books/chapters', { book, chapters });
};

exports.chapterCreate = async (req, res) => {
  const { book_id, title, content, is_free } = req.body;
  await BookChapter.create({ book_id, title, content, is_free: is_free === 'on' });
  res.redirect(`/admin/sach/${book_id}/chuong`);
};

exports.chapterEditForm = async (req, res) => {
  const chapter = await BookChapter.findById(req.params.id);
  if (!chapter) return res.redirect('/admin/sach');
  const book = await Book.findById(chapter.book_id);
  res.render('admin/books/chapter-form', { chapter, book });
};

exports.chapterUpdate = async (req, res) => {
  const { title, content, is_free, book_id } = req.body;
  await BookChapter.update(req.params.id, { title, content, is_free: is_free === 'on' });
  res.redirect(`/admin/sach/${book_id}/chuong`);
};

exports.chapterDelete = async (req, res) => {
  await BookChapter.delete(req.params.id);
  res.redirect(`/admin/sach/${req.body.book_id}/chuong`);
};

exports.chapterReorder = async (req, res) => {
  await BookChapter.reorder(req.body.ids);
  res.json({ ok: true });
};

// ---- Nhap noi dung chuong tu file Word/PDF hoac link Google Drive (tu dong tach chuong) ----
exports.chapterImportForm = async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.redirect('/admin/sach');
  res.render('admin/books/chapter-import-upload', { book, error: null });
};

exports.chapterImport = async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.redirect('/admin/sach');
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
      return res.render('admin/books/chapter-import-upload', { book, error: 'Vui lòng chọn file .docx/.pdf hoặc dán link Google Drive.' });
    }

    const rawText = await extractText(filePath);
    fs.unlink(filePath, () => {});

    if (!rawText || rawText.trim().length < 20) {
      return res.render('admin/books/chapter-import-upload', { book, error: 'Không đọc được nội dung chữ nào từ file này. Có thể đây là file scan dạng ảnh, hoặc file bị lỗi.' });
    }

    const chapters = splitIntoChapters(rawText);
    res.render('admin/books/chapter-import-review', { book, chapters });
  } catch (err) {
    console.error('Loi nhap noi dung sach:', err);
    if (filePath) fs.unlink(filePath, () => {});
    res.render('admin/books/chapter-import-upload', { book, error: 'Không đọc được file: ' + err.message });
  }
};

exports.chapterImportSave = async (req, res) => {
  const { book_id } = req.body;
  const rows = req.body.chapters ? Object.values(req.body.chapters) : [];
  for (const row of rows) {
    if (row.include !== 'on') continue;
    const title = (row.title || '').trim();
    if (!title) continue;
    await BookChapter.create({ book_id, title, content: row.content || '', is_free: row.is_free === 'on' });
  }
  res.redirect(`/admin/sach/${book_id}/chuong`);
};
