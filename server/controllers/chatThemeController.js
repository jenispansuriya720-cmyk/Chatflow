const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const UserSettings = require('../models/UserSettings');

const VALID_THEMES = [
  'default',
  'blue',
  'purple',
  'green',
  'midnight',
  'ocean',
  'sunset',
  'lavender',
  'rose',
  'forest',
  'sky',
  'minimal',
  'neon',
  'coffee',
  'aurora',
];

// @desc    Get conversation's shared theme
// @route   GET /api/conversations/:id/theme
// @access  Private
const getConversationTheme = async (req, res) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Verify user is a participant in this conversation
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      theme: conversation.theme || 'default',
      isDefault: !conversation.theme || conversation.theme === 'default',
    });
  } catch (err) {
    console.error('Error fetching conversation theme:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation theme' });
  }
};

// @desc    Update shared theme for a conversation
// @route   PUT /api/conversations/:id/theme or PUT /api/conversations/:conversationId/theme
// @access  Private
const updateConversationTheme = async (req, res) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Authorization: Verify user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    const themeInput = req.body.theme || req.body.themeId;
    if (!themeInput || typeof themeInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Theme name is required.',
      });
    }

    const selectedTheme = themeInput.trim().toLowerCase();
    if (!VALID_THEMES.includes(selectedTheme)) {
      return res.status(400).json({
        success: false,
        message: `Invalid theme name. Must be one of: ${VALID_THEMES.join(', ')}`,
      });
    }

    // Save shared theme on Conversation document
    conversation.theme = selectedTheme;
    await conversation.save();

    // Track in recently used themes for user settings
    if (selectedTheme !== 'default') {
      try {
        const settings = await UserSettings.findOne({ userId });
        if (settings) {
          if (!settings.appearance) settings.appearance = {};
          const recents = (settings.appearance.chatThemeRecent || []).filter(
            (id) => id !== selectedTheme
          );
          recents.unshift(selectedTheme);
          settings.appearance.chatThemeRecent = recents.slice(0, 6);
          await settings.save();
        }
      } catch (recentErr) {
        console.warn('Failed to update recent themes:', recentErr.message);
      }
    }

    // Real-time broadcast to the entire conversation room (User A + User B)
    if (req.io) {
      req.io.to(`conversation:${conversation._id}`).emit('chat:themeUpdated', {
        conversationId: conversation._id.toString(),
        theme: conversation.theme,
      });

      // Also notify individual participant personal rooms to sync conversation list badges
      conversation.participants.forEach((p) => {
        const pId = (p._id || p).toString();
        req.io.to(`user:${pId}`).emit('conversation:themeUpdated', {
          conversationId: conversation._id.toString(),
          theme: conversation.theme,
        });
      });
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      theme: conversation.theme,
      conversation,
    });
  } catch (err) {
    console.error('Error updating conversation theme:', err);
    return res.status(500).json({ success: false, message: 'Failed to update conversation theme' });
  }
};

// @desc    Reset conversation theme to default
// @route   DELETE /api/conversations/:id/theme
// @access  Private
const deleteConversationTheme = async (req, res) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    conversation.theme = 'default';
    await conversation.save();

    if (req.io) {
      req.io.to(`conversation:${conversation._id}`).emit('chat:themeUpdated', {
        conversationId: conversation._id.toString(),
        theme: 'default',
      });

      conversation.participants.forEach((p) => {
        const pId = (p._id || p).toString();
        req.io.to(`user:${pId}`).emit('conversation:themeUpdated', {
          conversationId: conversation._id.toString(),
          theme: 'default',
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat theme reset to default',
      conversationId: conversation._id,
      theme: 'default',
      isDefault: true,
    });
  } catch (err) {
    console.error('Error deleting conversation theme:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset conversation theme' });
  }
};

// @desc    Get user theme preferences (favorites, recently used, global fallback)
// @route   GET /api/conversations/themes/preferences
// @access  Private
const getThemePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = await UserSettings.create({ userId });
    }

    return res.status(200).json({
      success: true,
      favorites: settings.appearance?.chatThemeFavorites || [],
      recent: settings.appearance?.chatThemeRecent || [],
      globalChatAppearance: settings.appearance?.chatAppearance || {
        defaultTheme: 'default',
        bubbleStyle: 'classic',
        fontSize: 'medium',
        density: 'comfortable',
      },
    });
  } catch (err) {
    console.error('Error getting theme preferences:', err);
    return res.status(500).json({ success: false, message: 'Failed to load theme preferences' });
  }
};

// @desc    Toggle a theme as favorite
// @route   PUT /api/conversations/themes/favorites
// @access  Private
const toggleThemeFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { themeId } = req.body;

    if (!themeId) {
      return res.status(400).json({ success: false, message: 'themeId is required' });
    }

    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = await UserSettings.create({ userId });
    }

    const favorites = settings.appearance?.chatThemeFavorites || [];
    const index = favorites.indexOf(themeId);

    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(themeId);
    }

    if (!settings.appearance) settings.appearance = {};
    settings.appearance.chatThemeFavorites = favorites;
    await settings.save();

    return res.status(200).json({
      success: true,
      favorites,
    });
  } catch (err) {
    console.error('Error toggling theme favorite:', err);
    return res.status(500).json({ success: false, message: 'Failed to update favorite' });
  }
};

module.exports = {
  VALID_THEMES,
  getConversationTheme,
  updateConversationTheme,
  deleteConversationTheme,
  getThemePreferences,
  toggleThemeFavorite,
};
