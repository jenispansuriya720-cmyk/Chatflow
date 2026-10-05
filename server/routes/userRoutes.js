const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserSuggestions,
  getUserById,
  updateProfile,
  completeOnboarding,
  togglePrivacy,
  changePassword,
  getActiveSessions,
  logoutAllSessions,
  blockUser,
  unblockUser,
  deleteAccount,
  updatePrivacySettings,
  getSafetySummary,
  updateSafetyControls,
  exportUserData,
  getCreatorAnalytics,
  deleteProfilePicture,
  updateCoverImage,
  deleteCoverImage,
  updateNote,
  deleteNote,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const { toggleFollow } = require('../controllers/followController');

router.use(protect);

router.get('/', getUsers);
router.get('/suggestions', getUserSuggestions);
router.post('/onboarding', completeOnboarding);
router.put('/privacy', togglePrivacy);
router.put('/privacy/settings', updatePrivacySettings);
router.get('/safety/summary', getSafetySummary);
router.post('/safety/controls', updateSafetyControls);
router.get('/export-data', exportUserData);
router.get('/creator/analytics', getCreatorAnalytics);
router.get('/sessions', getActiveSessions);
router.delete('/sessions', logoutAllSessions);
router.delete('/account', deleteAccount);
router.put('/profile', updateProfile);
router.put('/note', updateNote);
router.delete('/note', deleteNote);
router.delete('/profile-picture', deleteProfilePicture);
router.put('/cover', updateCoverImage);
router.delete('/cover', deleteCoverImage);
router.put('/change-password', changePassword);
router.get('/:id', getUserById);
router.post('/:id/follow', toggleFollow);
router.post('/:id/block', blockUser);
router.post('/:id/unblock', unblockUser);

module.exports = router;
