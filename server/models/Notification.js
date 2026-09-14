const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'message',
        'reaction',
        'mention',
        'group_invite',
        'follow',
        'follow_request',
        'follow_accept',
        'connection_request',
        'connection_accept',
        'like',
        'comment',
      ],
      required: true,
    },
    actionStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'none'],
      default: 'none',
    },
    message: {
      type: String,
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
