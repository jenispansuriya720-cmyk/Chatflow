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

// Allowed extensions and corresponding MIME types for strict validation
const ALLOWED_IMAGE_EXTS = /^(jpe?g|png|webp|gif)$/i;
const ALLOWED_IMAGE_MIMES = /^image\/(jpeg|jpg|pjpeg|png|webp|gif)$/i;

const ALLOWED_MEDIA_EXTS = /^(jpe?g|png|webp|gif|mp4|webm|mov|mp3|wav|ogg|pdf|docx?|xlsx?|txt|zip)$/i;

// Image-only filter (for Posts, Reel covers, Stories, Chat images)
const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (!ALLOWED_IMAGE_EXTS.test(ext)) {
    return cb(
      new Error('Unsupported file extension. Allowed image formats: JPG, JPEG, PNG, WEBP, GIF.'),
      false
    );
  }

  if (!ALLOWED_IMAGE_MIMES.test(file.mimetype)) {
    return cb(
      new Error(`Unsupported image MIME type (${file.mimetype}). Please upload a valid image file.`),
      false
    );
  }

  cb(null, true);
};

// General media filter (supports images, audio, video, documents)
const generalFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (
    ALLOWED_MEDIA_EXTS.test(ext) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('video/')
  ) {
    cb(null, true);
  } else {
    cb(new Error(`File format .${ext} (${file.mimetype}) is not supported.`), false);
  }
};

// 20MB limit for images, 50MB for general media
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: generalFileFilter,
});

const uploadImageOnly = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max for images
  fileFilter: imageFileFilter,
});

upload.upload = upload;
upload.uploadImageOnly = uploadImageOnly;
upload.imageFileFilter = imageFileFilter;
upload.generalFileFilter = generalFileFilter;

module.exports = upload;

