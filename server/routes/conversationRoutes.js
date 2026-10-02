const express = require('express');
const router = express.Router();
const {
  getConversations,
  getOrCreateDirect,
  createGroup,
  getConversationById,
  updateGroup,
  leaveGroup,
  togglePin,
  toggleMute,
  deleteConversation,
} = require('../controllers/conversationController');
const {
  getConversationTheme,
  updateConversationTheme,
  deleteConversationTheme,
  getThemePreferences,
  toggleThemeFavorite,
} = require('../controllers/chatThemeController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Theme preferences (favorites, recents, global fallback)
router.get('/theme-preferences', getThemePreferences);
router.put('/theme-favorites', toggleThemeFavorite);

router.get('/', getConversations);
router.post('/direct', getOrCreateDirect);
router.post('/direct/:participantId', getOrCreateDirect);
router.post('/group', createGroup);
router.get('/:id', getConversationById);
router.put('/:id', updateGroup);
router.post('/:id/leave', leaveGroup);
router.put('/:id/pin', togglePin);
router.put('/:id/mute', toggleMute);
router.delete('/:id', deleteConversation);

// Shared Two-Sided Conversation Theme (shared across all conversation participants)
router.get('/:id/theme', getConversationTheme);
router.put('/:id/theme', updateConversationTheme);
router.delete('/:id/theme', deleteConversationTheme);

module.exports = router;
