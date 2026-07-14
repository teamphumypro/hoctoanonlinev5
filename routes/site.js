const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const examRoomController = require('../controllers/examRoomController');

router.get('/', siteController.home);
router.get('/khoa-hoc', siteController.allCourses);
router.get('/sach', siteController.allBooks);
router.get('/sach/:slug', siteController.bookDetail);
router.get('/sach/:slug/doc', siteController.bookRead);
router.get('/doc-sach-online', siteController.onlineReadingBooks);
router.get('/phong-thi', examRoomController.list);
router.get('/danh-muc/:slug', siteController.categoryPage);
router.get('/khoa-hoc/:slug', siteController.courseDetail);
router.get('/tin-tuc', siteController.newsList);
router.get('/tin-tuc/:slug', siteController.newsDetail);

module.exports = router;
