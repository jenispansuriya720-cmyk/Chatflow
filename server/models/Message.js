const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    clientMessageId: {
      type: String,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'voice', 'system'],
      default: 'text',
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: [
      {
        fileType: {
          type: String,
          enum: ['image', 'video', 'audio', 'document'],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          default: 'attachment',
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
    ],
    voiceData: {
      duration: {
        type: Number,
        default: 0,
      },
      waveform: {
        type: [Number],
        default: [],
      },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for compatibility
messageSchema.virtual('conversationId').get(function () {
  return this.conversation;
});
messageSchema.virtual('senderId').get(function () {
  return this.sender;
});
messageSchema.virtual('recipientId').get(function () {
  return this.receiver;
});
messageSchema.virtual('content').get(function () {
  return this.text;
});

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1, clientMessageId: 1 });

module.exports = mongoose.model('Message', messageSchema);
