const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const { deleteFromStorage } = require('../services/storageService');

/**
 * Clean up media files safely:
 * - Deletes from Cloudinary or local disk
 * - Checks if the media is referenced elsewhere before unlinking
 * - Deletes the Media record from MongoDB
 * 
 * @param {string|string[]} urls - Media URL(s) to delete
 * @param {string|ObjectId} ownerId - Owner ID for authorization
 */
const cleanupMedia = async (urls, ownerId = null) => {
  if (!urls) return;
  const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);

  for (const url of urlList) {
    try {
      // Find media records
      const mediaQuery = { url };
      if (ownerId) {
        mediaQuery.ownerId = ownerId;
      }

      const mediaRecord = await Media.findOne(mediaQuery);
      const publicId = mediaRecord?.publicId;
      const resourceType = mediaRecord?.type === 'video' ? 'video' : 'image';

      // Check if media is referenced elsewhere
      const count = await Media.countDocuments({ url });
      
      // Delete media entry for this owner/entity
      await Media.deleteMany(mediaQuery);

      // If no other references remain, delete from storage (Cloudinary or local)
      if (count <= 1) {
        await deleteFromStorage(publicId, url, resourceType);
      }
    } catch (err) {
      console.warn(`[mediaCleanup] Error cleaning up media ${url}:`, err.message);
    }
  }
};

module.exports = { cleanupMedia };
