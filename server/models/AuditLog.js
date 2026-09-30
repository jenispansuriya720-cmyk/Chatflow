const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['message', 'post', 'reel', 'story', 'media', 'profilePicture', 'profile_picture', 'coverImage', 'cover'],
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['delete', 'soft_delete', 'delete_for_me', 'update', 'remove'],
      default: 'delete',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ contentType: 1, contentId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
