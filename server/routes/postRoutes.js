const express = require('express');
const router = express.Router();
const {
  getFeed,
  getSavedPosts,
  getUserPosts,
  getPostById,
  createPost,
  toggleLike,
  toggleSave,
  getComments,
  addComment,
  deletePost,
  sharePostToChat,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/feed', getFeed);
router.get('/saved', getSavedPosts);
router.get('/user/:userId', getUserPosts);
router.get('/:id', getPostById);
router.post('/', createPost);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/save', toggleSave);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.post('/:id/share', sharePostToChat);

module.exports = router;
