const express = require('express');
const router = express.Router();
const {
  getStories,
  createStory,
  viewStory,
  getStoryViewers,
  reactToStory,
  replyToStory,
  deleteStory,
} = require('../controllers/storyController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getStories);
router.get('/feed', getStories);
router.post('/', createStory);
router.post('/:id/view', viewStory);
router.get('/:id/viewers', getStoryViewers);
router.post('/:id/react', reactToStory);
router.post('/:id/reply', replyToStory);
router.delete('/:id', deleteStory);

module.exports = router;
