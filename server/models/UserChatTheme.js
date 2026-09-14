const mongoose = require('mongoose');

const customThemeSchema = new mongoose.Schema(
  {
    background: { type: String, default: '#ffffff' },
    backgroundSecondary: { type: String, default: '#f8fafc' },
    incomingBubble: { type: String, default: '#ffffff' },
    incomingText: { type: String, default: '#0f172a' },
    outgoingBubble: { type: String, default: '#4f46e5' },
    outgoingText: { type: String, default: '#ffffff' },
    headerBackground: { type: String, default: '#ffffff' },
    inputBackground: { type: String, default: '#f1f5f9' },
    inputText: { type: String, default: '#0f172a' },
    inputPlaceholder: { type: String, default: '#94a3b8' },
    primaryAccent: { type: String, default: '#4f46e5' },
    secondaryAccent: { type: String, default: '#6366f1' },
    borderColor: { type: String, default: '#e2e8f0' },
    timestampColor: { type: String, default: '#94a3b8' },
    linkColor: { type: String, default: '#3b82f6' },
    wallpaper: { type: String, default: '' },
    wallpaperOpacity: {
      type: Number,
      default: 80,
      min: [20, 'Wallpaper opacity cannot be less than 20%'],
      max: [100, 'Wallpaper opacity cannot exceed 100%'],
    },
  },
  { _id: false }
);

const userChatThemeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    themeType: {
      type: String,
      enum: ['preset', 'custom'],
      default: 'preset',
    },
    themeId: {
      type: String,
      default: 'default',
      trim: true,
    },
    bubbleStyle: {
      type: String,
      enum: ['classic', 'soft', 'compact', 'minimal'],
      default: 'classic',
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    density: {
      type: String,
      enum: ['comfortable', 'compact', 'spacious'],
      default: 'comfortable',
    },
    backgroundEffect: {
      type: String,
      enum: ['none', 'subtle_pattern', 'soft_gradient', 'wallpaper'],
      default: 'none',
    },
    customTheme: {
      type: customThemeSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: One personal theme per user per conversation
userChatThemeSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('UserChatTheme', userChatThemeSchema);
