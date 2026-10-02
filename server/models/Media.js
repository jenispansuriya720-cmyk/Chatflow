const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document'],
      default: 'image',
    },
    entityType: {
      type: String,
      enum: ['post', 'reel', 'story', 'message', 'chat', 'profile', 'avatar', 'cover', 'general'],
      default: 'general',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    name: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.index({ ownerId: 1, url: 1 });
mediaSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Media', mediaSchema);
