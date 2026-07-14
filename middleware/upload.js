const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, uuidv4() + ext);
    }
  });
}

const uploadAvatar = multer({ storage: makeStorage('avatars'), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadThumbnail = multer({ storage: makeStorage('thumbnails'), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadVideo = multer({ storage: makeStorage('videos'), limits: { fileSize: 500 * 1024 * 1024 } });
const uploadFile = multer({ storage: makeStorage('files'), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadExamDoc = multer({
  storage: makeStorage('exam-imports'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(docx|pdf|doc)$/i.test(file.originalname);
    cb(null, ok);
  }
});

module.exports = { uploadAvatar, uploadThumbnail, uploadVideo, uploadFile, uploadExamDoc };
