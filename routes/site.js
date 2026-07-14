const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');

router.get('/', siteController.home);
router.get('/khoa-hoc', siteController.allCourses);
router.get('/sach', siteController.allBooks);
router.get('/sach/:slug', siteController.bookDetail);
router.get('/danh-muc/:slug', siteController.categoryPage);
router.get('/khoa-hoc/:slug', siteController.courseDetail);
router.get('/tin-tuc', siteController.newsList);
router.get('/tin-tuc/:slug', siteController.newsDetail);

module.exports = router;
