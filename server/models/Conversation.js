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

// Helpful index for looking up conversations by participant
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
