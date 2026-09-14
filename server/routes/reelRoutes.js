const express = require('express');
const router = express.Router();
const {
  getReelsFeed,
  getUserReels,
  getSavedReels,
  createReel,
  toggleLike,
  recordView,
  toggleSave,
  getComments,
  addComment,
  deleteReel,
} = require('../controllers/reelController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/feed', getReelsFeed);
router.get('/saved', getSavedReels);
router.get('/user/:userId', getUserReels);
router.post('/', createReel);
router.delete('/:id', deleteReel);
router.post('/:id/like', toggleLike);
router.post('/:id/view', recordView);
router.post('/:id/save', toggleSave);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

module.exports = router;
