const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    video: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    thumbnailPublicId: {
      type: String,
      default: '',
    },
    videoPublicId: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    audio: {
      title: { type: String, default: 'Original Audio' },
      artist: { type: String, default: 'ChatFlow Creator' },
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: true,
  }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ views: -1 });
reelSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Reel', reelSchema);
