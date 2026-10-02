const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { upload, uploadImageOnly } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { uploadToStorage, deleteFromStorage } = require('../services/storageService');
const Media = require('../models/Media');

// Helper to determine general media fileType
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};

// Generic file processor for all upload routes
const processUpload = async (req, res, next, defaultEntityType = 'general') => {
  let storageResult = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Reject empty files
    if (req.file.size === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty (0 bytes).',
      });
    }

    const entityType = req.body.entityType || req.query.entityType || defaultEntityType;
    const fileType = getFileType(req.file.mimetype);

    // 1. Upload to storage (Cloudinary or local storage)
    storageResult = await uploadToStorage(req.file, entityType);

    // 2. Persist media metadata in MongoDB
    try {
      await Media.create({
        ownerId: req.user._id,
        url: storageResult.url,
        publicId: storageResult.publicId || '',
        type: fileType,
        entityType: entityType,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (dbError) {
      // Cleanup orphaned storage file if database save fails (Requirement 16)
      console.warn('[UploadRoutes] DB media save failed, cleaning storage:', dbError.message);
      await deleteFromStorage(
        storageResult.publicId,
        storageResult.url,
        fileType === 'video' ? 'video' : 'image'
      );
      throw dbError;
    }

    // 3. Return confirmation and permanent URL
    res.status(200).json({
      success: true,
      file: {
        url: storageResult.url,
        publicId: storageResult.publicId,
        fileType,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        storageType: storageResult.storageType,
      },
    });
  } catch (error) {
    // If multer file was placed on disk and not yet processed, clean up
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

// Multer error handling wrapper
const handleMulterUpload = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size exceeds allowed limit (Max 20MB for images, 50MB for video).',
            });
          }
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload request.',
        });
      }
      next();
    });
  };
};

// General upload endpoint
router.post(
  '/',
  protect,
  handleMulterUpload(upload.single('file')),
  async (req, res, next) => {
    await processUpload(req, res, next, req.body.entityType || 'general');
  }
);

// Dedicated Post image upload endpoint
router.post(
  '/post-image',
  protect,
  handleMulterUpload(uploadImageOnly.single('file')),
  async (req, res, next) => {
    await processUpload(req, res, next, 'post');
  }
);

// Dedicated Reel cover image upload endpoint
router.post(
  '/reel-cover',
  protect,
  handleMulterUpload(uploadImageOnly.single('file')),
  async (req, res, next) => {
    await processUpload(req, res, next, 'reel');
  }
);

// Dedicated Story image upload endpoint
router.post(
  '/story-image',
  protect,
  handleMulterUpload(uploadImageOnly.single('file')),
  async (req, res, next) => {
    await processUpload(req, res, next, 'story');
  }
);

// Dedicated Chat image upload endpoint
router.post(
  '/chat-image',
  protect,
  handleMulterUpload(uploadImageOnly.single('file')),
  async (req, res, next) => {
    await processUpload(req, res, next, 'message');
  }
);

module.exports = router;
