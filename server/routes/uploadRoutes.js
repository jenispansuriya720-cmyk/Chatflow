const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  // Determine fileType
  let fileType = 'document';
  if (req.file.mimetype.startsWith('image/')) {
    fileType = 'image';
  } else if (req.file.mimetype.startsWith('audio/')) {
    fileType = 'audio';
  } else if (req.file.mimetype.startsWith('video/')) {
    fileType = 'video';
  }

  // Construct accessible URL
  const fileUrl = `/uploads/${req.file.filename}`;

  res.status(200).json({
    success: true,
    file: {
      url: fileUrl,
      fileType,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
});

module.exports = router;
