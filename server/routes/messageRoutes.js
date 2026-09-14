const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
  markAsDelivered,
  syncUndelivered,
  forwardMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:conversationId', getMessages);
router.post('/', sendMessage);
router.post('/sync-undelivered', syncUndelivered);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/react', reactToMessage);
router.put('/read/:conversationId', markAsRead);
router.put('/delivered/:conversationId', markAsDelivered);
router.post('/:id/forward', forwardMessage);

module.exports = router;
