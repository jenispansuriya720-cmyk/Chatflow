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
      enum: [
        'text',
        'emoji',
        'image',
        'video',
        'gif',
        'audio',
        'file',
        'voice',
        'shared_post',
        'shared_reel',
        'shared_story',
        'poll',
        'event',
        'system',
        'media',
      ],
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
        publicId: {
          type: String,
          default: '',
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
    imageUrl: {
      type: String,
      default: '',
    },
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
    sharedContent: {
      contentType: {
        type: String,
        enum: ['post', 'reel', 'story'],
      },
      contentId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      authorName: {
        type: String,
        default: '',
      },
      authorUsername: {
        type: String,
        default: '',
      },
      titleOrCaption: {
        type: String,
        default: '',
      },
      thumbnailUrl: {
        type: String,
        default: '',
      },
      mediaUrl: {
        type: String,
        default: '',
      },
      isUnavailable: {
        type: Boolean,
        default: false,
      },
    },
    pollData: {
      question: { type: String, default: '' },
      options: [
        {
          text: String,
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        },
      ],
    },
    eventData: {
      title: { type: String, default: '' },
      date: { type: Date },
      location: { type: String, default: '' },
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
        createdAt: {
          type: Date,
          default: Date.now,
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
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
messageSchema.virtual('messageType').get(function () {
  return this.type;
});
messageSchema.virtual('resolvedImageUrl').get(function () {
  if (this.imageUrl) return this.imageUrl;
  if (this.attachments && this.attachments.length > 0 && this.attachments[0].fileType === 'image') {
    return this.attachments[0].url;
  }
  return '';
});

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, sender: 1, status: 1 });
messageSchema.index({ sender: 1, clientMessageId: 1 });

module.exports = mongoose.model('Message', messageSchema);
