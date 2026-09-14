const mongoose = require('mongoose');
const UserChatTheme = require('../models/UserChatTheme');
const Conversation = require('../models/Conversation');
const UserSettings = require('../models/UserSettings');

// Color / CSS validation regex: safe hex (#fff, #ffffff, #ffffff80), rgb, rgba, hsl, linear-gradient
const SAFE_COLOR_REGEX =
  /^#([0-9a-fA-F]{3,8})$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$|^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$|^hsl\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)$|^linear-gradient\([^<>"'`;]+\)$/;

const sanitizeColor = (val, fallback = '#ffffff') => {
  if (!val || typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (
    trimmed.includes('javascript:') ||
    trimmed.includes('expression(') ||
    trimmed.includes('url(') ||
    trimmed.includes('eval(') ||
    trimmed.includes('<') ||
    trimmed.includes('>')
  ) {
    return fallback;
  }
  return SAFE_COLOR_REGEX.test(trimmed) ? trimmed : fallback;
};

const sanitizeWallpaper = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('"') ||
    trimmed.includes("'")
  ) {
    return '';
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return '';
};

// @desc    Get user's personal theme for a conversation
// @route   GET /api/conversations/:id/theme
// @access  Private
const getConversationTheme = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    const theme = await UserChatTheme.findOne({ userId, conversationId });

    return res.status(200).json({
      success: true,
      theme: theme || null,
      isDefault: !theme,
    });
  } catch (err) {
    console.error('Error fetching conversation theme:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation theme' });
  }
};

// @desc    Update or create personal theme for a conversation
// @route   PUT /api/conversations/:id/theme
// @access  Private
const updateConversationTheme = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Authorization: Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    const {
      themeType = 'preset',
      themeId = 'default',
      bubbleStyle = 'classic',
      fontSize = 'medium',
      density = 'comfortable',
      backgroundEffect = 'none',
      customTheme = {},
    } = req.body;

    const sanitizedThemeId = String(themeId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default';

    const validBubbleStyles = ['classic', 'soft', 'compact', 'minimal'];
    const validFontSizes = ['small', 'medium', 'large'];
    const validDensities = ['comfortable', 'compact', 'spacious'];
    const validEffects = ['none', 'subtle_pattern', 'soft_gradient', 'wallpaper'];

    const safeBubbleStyle = validBubbleStyles.includes(bubbleStyle) ? bubbleStyle : 'classic';
    const safeFontSize = validFontSizes.includes(fontSize) ? fontSize : 'medium';
    const safeDensity = validDensities.includes(density) ? density : 'comfortable';
    const safeBackgroundEffect = validEffects.includes(backgroundEffect) ? backgroundEffect : 'none';

    let safeCustom = {};
    if (themeType === 'custom' || customTheme) {
      safeCustom = {
        background: sanitizeColor(customTheme.background, '#ffffff'),
        backgroundSecondary: sanitizeColor(customTheme.backgroundSecondary, '#f8fafc'),
        incomingBubble: sanitizeColor(customTheme.incomingBubble, '#ffffff'),
        incomingText: sanitizeColor(customTheme.incomingText, '#0f172a'),
        outgoingBubble: sanitizeColor(customTheme.outgoingBubble, '#4f46e5'),
        outgoingText: sanitizeColor(customTheme.outgoingText, '#ffffff'),
        headerBackground: sanitizeColor(customTheme.headerBackground, '#ffffff'),
        inputBackground: sanitizeColor(customTheme.inputBackground, '#f1f5f9'),
        inputText: sanitizeColor(customTheme.inputText, '#0f172a'),
        inputPlaceholder: sanitizeColor(customTheme.inputPlaceholder, '#94a3b8'),
        primaryAccent: sanitizeColor(customTheme.primaryAccent, '#4f46e5'),
        secondaryAccent: sanitizeColor(customTheme.secondaryAccent, '#6366f1'),
        borderColor: sanitizeColor(customTheme.borderColor, '#e2e8f0'),
        timestampColor: sanitizeColor(customTheme.timestampColor, '#94a3b8'),
        linkColor: sanitizeColor(customTheme.linkColor, '#3b82f6'),
        wallpaper: sanitizeWallpaper(customTheme.wallpaper),
        wallpaperOpacity: Math.min(100, Math.max(20, Number(customTheme.wallpaperOpacity) || 80)),
      };
    }

    const updatedTheme = await UserChatTheme.findOneAndUpdate(
      { userId, conversationId },
      {
        themeType: themeType === 'custom' ? 'custom' : 'preset',
        themeId: sanitizedThemeId,
        bubbleStyle: safeBubbleStyle,
        fontSize: safeFontSize,
        density: safeDensity,
        backgroundEffect: safeBackgroundEffect,
        customTheme: safeCustom,
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Track in recently used themes (up to 6 unique items)
    if (sanitizedThemeId && sanitizedThemeId !== 'default') {
      try {
        const settings = await UserSettings.findOne({ userId });
        if (settings) {
          const recents = (settings.appearance?.chatThemeRecent || []).filter(
            (id) => id !== sanitizedThemeId
          );
          recents.unshift(sanitizedThemeId);
          settings.appearance.chatThemeRecent = recents.slice(0, 6);
          await settings.save();
        }
      } catch (recentErr) {
        console.warn('Failed to update recent themes:', recentErr.message);
      }
    }

    // Strictly personal: do NOT broadcast to conversation socket room!
    return res.status(200).json({
      success: true,
      theme: updatedTheme,
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
    const { id: conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    await UserChatTheme.findOneAndDelete({ userId, conversationId });

    return res.status(200).json({
      success: true,
      message: 'Chat theme reset to default',
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
  getConversationTheme,
  updateConversationTheme,
  deleteConversationTheme,
  getThemePreferences,
  toggleThemeFavorite,
};
