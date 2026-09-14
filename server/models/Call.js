const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
      required: true,
    },
    status: {
      type: String,
      enum: ['calling', 'ringing', 'completed', 'missed', 'declined', 'cancelled', 'busy', 'failed'],
      default: 'completed',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0, // Duration in seconds
    },
    endedReason: {
      type: String,
      default: 'normal',
    },
  },
  {
    timestamps: true,
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
