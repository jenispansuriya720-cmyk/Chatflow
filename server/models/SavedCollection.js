const mongoose = require('mongoose');

const savedCollectionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: 'All Saved',
      trim: true,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    reels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel',
      },
    ],
  },
  {
    timestamps: true,
  }
);

savedCollectionSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('SavedCollection', savedCollectionSchema);
