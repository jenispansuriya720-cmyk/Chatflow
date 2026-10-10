const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    groupName: {
      type: String,
      trim: true,
      default: '',
    },
    groupImage: {
      type: String,
      default: '',
    },
    groupDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    theme: {
      type: String,
      default: 'default',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast inbox sorting and participant lookup
conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1, type: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
