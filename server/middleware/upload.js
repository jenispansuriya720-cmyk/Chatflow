const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('[Upload Directory Warning]:', e.message);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common image, audio, video, and doc types
  const allowedExtensions = /jpeg|jpg|png|webp|gif|mp4|webm|mov|mp3|wav|ogg|pdf|doc|docx|xls|xlsx|txt|zip/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (allowedExtensions.test(ext) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('File format is not supported.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
