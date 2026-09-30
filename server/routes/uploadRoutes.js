const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

const Media = require('../models/Media');

router.post('/', protect, upload.single('file'), async (req, res, next) => {
  try {
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

    // Record Media entry for ownership tracking
    await Media.create({
      ownerId: req.user._id,
      url: fileUrl,
      type: fileType,
      entityType: req.body.entityType || 'general',
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });

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
  } catch (error) {
    next(error);
  }
});

module.exports = router;
