const express = require('express');
const router = express.Router();
const {
  startLive,
  getActiveStreams,
  getStreamById,
  endLive,
  joinLive,
  leaveLive,
} = require('../controllers/liveController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', startLive);
router.get('/', getActiveStreams);
router.get('/:id', getStreamById);
router.post('/:id/end', endLive);
router.post('/:id/join', joinLive);
router.post('/:id/leave', leaveLive);

module.exports = router;
