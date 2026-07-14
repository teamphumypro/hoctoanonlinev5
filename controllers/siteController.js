const Category = require('../models/Category');
const Course = require('../models/Course');
const Banner = require('../models/Banner');
const News = require('../models/News');
const Enrollment = require('../models/Enrollment');

exports.home = async (req, res) => {
  const [categories, courses, banners, news] = await Promise.all([
    Category.tree(),
    Course.published(),
    Banner.active(),
    News.published()
  ]);
  res.render('index', { categories, courses: courses.slice(0, 12), banners, news: news.slice(0, 4) });
};

exports.allCourses = async (req, res) => {
  const courses = await Course.published();
  const categories = await Category.tree();
  res.render('all-courses', { courses, categories });
};

exports.categoryPage = async (req, res) => {
  const category = await Category.findBySlug(req.params.slug);
  if (!category) return res.status(404).render('404');
  const courses = await Course.byCategory(category.id);
  const categories = await Category.tree();
  res.render('category', { category, courses, categories });
};

exports.courseDetail = async (req, res) => {
  const course = await Course.findBySlug(req.params.slug);
  if (!course) return res.status(404).render('404');
  await Course.incrementView(course.id);
  const chapters = await Course.fullTree(course.id);
  let enrolled = false;
  if (req.session.user) enrolled = await Enrollment.isEnrolled(req.session.user.id, course.id);
  res.render('course-detail', { course, chapters, enrolled });
};

exports.allBooks = async (req, res) => {
  const Book = require('../models/Book');
  const BookType = require('../models/BookType');
  const Category = require('../models/Category');

  const categories = await Category.tree();
  const bookTypes = await BookType.all();

  let category_id = null, book_type_id = null;
  if (req.query.danh_muc) {
    const cat = await Category.findBySlug(req.query.danh_muc);
    if (cat) category_id = cat.id;
  }
  if (req.query.the_loai) {
    const bt = await BookType.findBySlug(req.query.the_loai);
    if (bt) book_type_id = bt.id;
  }

  const books = await Book.published({ category_id, book_type_id });
  res.render('all-books', { books, categories, bookTypes, activeCategory: req.query.danh_muc || null, activeType: req.query.the_loai || null });
};

exports.bookDetail = async (req, res) => {
  const Book = require('../models/Book');
  const BookPurchase = require('../models/BookPurchase');
  const book = await Book.findBySlug(req.params.slug);
  if (!book) return res.status(404).render('404');
  let purchased = false;
  if (req.session.user) purchased = await BookPurchase.isPurchased(req.session.user.id, book.id);
  res.render('book-detail', { book, purchased });
};

exports.newsList = async (req, res) => {
  const news = await News.published();
  res.render('news-list', { news });
};

exports.newsDetail = async (req, res) => {
  const article = await News.findBySlug(req.params.slug);
  if (!article) return res.status(404).render('404');
  res.render('news-detail', { article });
};
