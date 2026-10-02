const path = require('path');
const fs = require('fs');

let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
} catch (e) {
  cloudinary = null;
}

// Check if Cloudinary credentials are provided in environment
const isCloudinaryConfigured = () => {
  if (!cloudinary) return false;
  const hasKeys = Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET) ||
      process.env.CLOUDINARY_URL
  );
  return hasKeys;
};

if (isCloudinaryConfigured()) {
  try {
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config();
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    console.log('[StorageService] Cloudinary configured and active.');
  } catch (err) {
    console.warn('[StorageService] Error initializing Cloudinary:', err.message);
  }
} else {
  console.log('[StorageService] Using project local media storage (/uploads).');
}

const getUploadDir = () => {
  const dir = process.env.VERCEL
    ? path.join('/tmp', 'uploads')
    : path.join(__dirname, '..', 'uploads');

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn('[StorageService] Upload Directory Warning:', e.message);
  }
  return dir;
};

// Map entity type / folder name to designated Cloudinary folder
const getLogicalFolder = (entityType) => {
  const normalized = (entityType || '').toLowerCase();
  switch (normalized) {
    case 'post':
    case 'posts':
      return 'chatflow/posts';
    case 'reel':
    case 'reels':
      return 'chatflow/reels';
    case 'story':
    case 'stories':
      return 'chatflow/stories';
    case 'chat':
    case 'message':
    case 'messages':
      return 'chatflow/chat';
    case 'avatar':
    case 'profile':
      return 'chatflow/profiles';
    default:
      return 'chatflow/general';
  }
};

/**
 * Upload a file to storage (Cloudinary if configured, otherwise local disk storage)
 * @param {Object} file - Multer file object
 * @param {string} entityType - 'post', 'reel', 'story', 'chat', 'general'
 * @returns {Promise<{ url: string, publicId: string, size: number, mimeType: string, storageType: string }>}
 */
const uploadToStorage = async (file, entityType = 'general') => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const folder = getLogicalFolder(entityType);
  const isVideo = file.mimetype.startsWith('video/');
  const isAudio = file.mimetype.startsWith('audio/');
  const resourceType = isVideo ? 'video' : isAudio ? 'video' : 'image';

  // 1. Cloudinary upload if configured
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      };

      const handleResult = (error, result) => {
        // If multer saved to disk, remove temporary file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlink(file.path, () => {});
        }

        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          size: result.bytes || file.size,
          mimeType: file.mimetype,
          storageType: 'cloudinary',
          format: result.format,
          width: result.width,
          height: result.height,
        });
      };

      // Upload from disk file if available
      if (file.path && fs.existsSync(file.path)) {
        cloudinary.uploader.upload(file.path, uploadOptions, handleResult);
      } else if (file.buffer) {
        // Upload from memory buffer
        const stream = cloudinary.uploader.upload_stream(uploadOptions, handleResult);
        stream.end(file.buffer);
      } else {
        reject(new Error('Invalid file payload: Neither path nor buffer available.'));
      }
    });
  }

  // 2. Local disk storage fallback
  const uploadDir = getUploadDir();
  let filename = file.filename;

  if (!filename) {
    // If memory storage was used
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = (file.originalname || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
    filename = `${uniqueSuffix}-${sanitizedOriginal}`;
    const destinationPath = path.join(uploadDir, filename);
    if (file.buffer) {
      fs.writeFileSync(destinationPath, file.buffer);
    }
  }

  const publicId = `local_${folder.replace('/', '_')}_${filename}`;
  const fileUrl = `/uploads/${filename}`;

  return {
    url: fileUrl,
    publicId,
    size: file.size,
    mimeType: file.mimetype,
    storageType: 'local',
  };
};

/**
 * Delete a media file from storage (Cloudinary or local disk)
 * @param {string} publicId - Storage public ID
 * @param {string} url - Media URL
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
const deleteFromStorage = async (publicId, url, resourceType = 'image') => {
  // If publicId belongs to Cloudinary or Cloudinary is configured and ID is not local
  if (
    cloudinary &&
    publicId &&
    !publicId.startsWith('local_') &&
    (isCloudinaryConfigured() || publicId.startsWith('chatflow/'))
  ) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.warn('[StorageService] Cloudinary deletion error:', err.message);
    }
  }

  // Check if URL points to local uploads/
  if (url && typeof url === 'string' && url.includes('/uploads/')) {
    try {
      const filename = path.basename(url.split('?')[0]);
      const uploadDir = getUploadDir();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('[StorageService] Local disk unlink error:', err.message);
    }
  }
};

module.exports = {
  uploadToStorage,
  deleteFromStorage,
  isCloudinaryConfigured,
  getLogicalFolder,
  getUploadDir,
};
