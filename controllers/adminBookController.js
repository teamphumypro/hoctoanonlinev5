const Book = require('../models/Book');
const BookType = require('../models/BookType');
const Category = require('../models/Category');
const { makeSlug } = require('../utils');

exports.list = async (req, res) => {
  const books = await Book.all();
  res.render('admin/books/list', { books });
};

exports.newForm = async (req, res) => {
  const categories = await Category.all();
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
  const categories = await Category.all();
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
