const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getSectionSettings,
  updateSectionSettings,
  toggle2FA,
  revokeConnectedApp,
  clearAiHistory,
  clearCache,
  deactivateAccount,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSettings);
router.patch('/', updateSettings);

router.post('/security/2fa', toggle2FA);
router.post('/connected-apps/revoke', revokeConnectedApp);
router.post('/ai/clear-history', clearAiHistory);
router.post('/data/clear-cache', clearCache);
router.post('/account/deactivate', deactivateAccount);

router.get('/:section', getSectionSettings);
router.patch('/:section', updateSectionSettings);

module.exports = router;
