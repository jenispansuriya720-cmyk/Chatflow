const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');

/**
 * Clean up media files safely:
 * - Checks if the file is stored locally in uploads/
 * - Checks if the media is referenced elsewhere before unlinking
 * - Deletes the Media record from the database
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

      // Check if media is referenced elsewhere
      const count = await Media.countDocuments({ url });
      
      // Delete media entry for this owner/entity
      await Media.deleteMany(mediaQuery);

      // If no other references remain and it's a local file in uploads/
      if (count <= 1 && typeof url === 'string' && url.includes('/uploads/')) {
        const filename = path.basename(url.split('?')[0]);
        const filePath = path.join(__dirname, '..', 'uploads', filename);

        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.warn(`[mediaCleanup] Could not unlink file ${filePath}:`, err.message);
            }
          });
        }
      }
    } catch (err) {
      console.warn(`[mediaCleanup] Error cleaning up media ${url}:`, err.message);
    }
  }
};

module.exports = { cleanupMedia };
