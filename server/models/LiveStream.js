const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Stream title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    streamKey: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15),
    },
    status: {
      type: String,
      enum: ['preparing', 'connecting', 'live', 'ending', 'ended'],
      default: 'live',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['everyone', 'followers', 'connections', 'custom'],
      default: 'everyone',
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    peakViewers: {
      type: Number,
      default: 0,
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
    guestsEnabled: {
      type: Boolean,
      default: true,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    replayUrl: {
      type: String,
      default: '',
    },
    stats: {
      duration: { type: Number, default: 0 }, // seconds
      commentsCount: { type: Number, default: 0 },
      reactionsCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

liveStreamSchema.virtual('creatorId').get(function () {
  return this.host;
});
liveStreamSchema.virtual('peakViewerCount').get(function () {
  return this.peakViewers;
});

liveStreamSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('LiveStream', liveStreamSchema);
