const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { cleanupMedia } = require('../utils/mediaCleanup');

// @desc    Get reels feed
// @route   GET /api/reels/feed
// @access  Private
const getReelsFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { visibility: { $ne: 'private' } };

    if (req.query.tag) {
      const cleanTag = req.query.tag.replace('#', '').toLowerCase();
      query.hashtags = cleanTag;
    } else if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      query.$or = [{ caption: regex }, { hashtags: regex }];
    }

    const total = await Reel.countDocuments(query);
    const [reels, user] = await Promise.all([
      Reel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'fullName username profilePicture bio')
        .lean(),
      User.findById(currentUserId).select('savedReels').lean(),
    ]);

    const savedSet = new Set((user?.savedReels || []).map((id) => id.toString()));
    const reelsWithFlags = reels.map((reel) => {
      const isLiked = (reel.likes || []).some(
        (id) => id.toString() === currentUserId.toString()
      );
      const isSaved = savedSet.has(reel._id.toString());
      const likesCount = reel.likes ? reel.likes.length : 0;
      return {
        ...reel,
        isLiked,
        isSaved,
        likesCount,
      };
    });

    res.status(200).json({
      success: true,
      count: reelsWithFlags.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      reels: reelsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reels
// @route   GET /api/reels/user/:userId
// @access  Private
const getUserReels = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const [reels, user] = await Promise.all([
      Reel.find({ author: userId })
        .sort({ createdAt: -1 })
        .populate('author', 'fullName username profilePicture')
        .lean(),
      User.findById(currentUserId).select('savedReels').lean(),
    ]);

    const savedSet = new Set((user?.savedReels || []).map((id) => id.toString()));
    const reelsWithFlags = reels.map((reel) => {
      const isLiked = (reel.likes || []).some(
        (id) => id.toString() === currentUserId.toString()
      );
      const isSaved = savedSet.has(reel._id.toString());
      const likesCount = reel.likes ? reel.likes.length : 0;
      return {
        ...reel,
        isLiked,
        isSaved,
        likesCount,
      };
    });

    res.status(200).json({
      success: true,
      count: reelsWithFlags.length,
      reels: reelsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's saved reels
// @route   GET /api/reels/saved
// @access  Private
const getSavedReels = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('savedReels').lean();
    const savedIds = user?.savedReels || [];

    const reels = await Reel.find({ _id: { $in: savedIds } })
      .sort({ createdAt: -1 })
      .populate('author', 'fullName username profilePicture')
      .lean();

    const reelsWithFlags = reels.map((reel) => {
      const isLiked = (reel.likes || []).some(
        (id) => id.toString() === req.user._id.toString()
      );
      return {
        ...reel,
        isLiked,
        isSaved: true,
        likesCount: reel.likes ? reel.likes.length : 0,
      };
    });

    res.status(200).json({
      success: true,
      count: reelsWithFlags.length,
      reels: reelsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a reel
// @route   POST /api/reels
// @access  Private
const createReel = async (req, res, next) => {
  try {
    const { thumbnail, caption, hashtags, audio } = req.body;
    const video = req.body.video || req.body.videoUrl;

    if (!video) {
      return res.status(400).json({ success: false, message: 'Video URL is required for a reel.' });
    }

    let tags = Array.isArray(hashtags) ? hashtags : [];
    if (caption && tags.length === 0) {
      const match = caption.match(/#[a-z0-9_]+/gi);
      if (match) {
        tags = match.map((t) => t.replace('#', '').toLowerCase());
      }
    }

    const reel = await Reel.create({
      author: req.user._id,
      video,
      thumbnail: thumbnail || '',
      caption: caption || '',
      hashtags: tags,
      audio: audio || { title: 'Original Audio', artist: req.user.fullName || req.user.username },
    });

    const populated = await Reel.findById(reel._id).populate(
      'author',
      'fullName username profilePicture'
    );

    res.status(201).json({
      success: true,
      reel: {
        ...populated.toObject(),
        isLiked: false,
        isSaved: false,
        likesCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Like / Unlike a reel
// @route   POST /api/reels/:id/like
// @access  Private
const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const hasLiked = reel.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      reel.likes = reel.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      reel.likes.push(userId);

      if (reel.author.toString() !== userId.toString()) {
        const notif = await Notification.create({
          user: reel.author,
          sender: userId,
          type: 'like',
          message: `${req.user.fullName} liked your reel`,
        });
        if (req.io) {
          req.io.to(`user:${reel.author}`).emit('new_notification', notif);
        }
      }
    }

    await reel.save();

    res.status(200).json({
      success: true,
      isLiked: !hasLiked,
      likesCount: reel.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record view for a reel
// @route   POST /api/reels/:id/view
// @access  Public / Private
const recordView = async (req, res, next) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    res.status(200).json({
      success: true,
      views: reel.views,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save / Unsave a reel
// @route   POST /api/reels/:id/save
// @access  Private
const toggleSave = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const hasSaved = (user.savedReels || []).some(
      (id) => id.toString() === reel._id.toString()
    );

    if (hasSaved) {
      user.savedReels = user.savedReels.filter(
        (id) => id.toString() !== reel._id.toString()
      );
      reel.savesCount = Math.max(0, (reel.savesCount || 0) - 1);
    } else {
      if (!user.savedReels) user.savedReels = [];
      user.savedReels.push(reel._id);
      reel.savesCount = (reel.savesCount || 0) + 1;
    }

    await user.save();
    await reel.save();

    res.status(200).json({
      success: true,
      isSaved: !hasSaved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reel comments
// @route   GET /api/reels/:id/comments
// @access  Private
const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ reel: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'fullName username profilePicture');

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to reel
// @route   POST /api/reels/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
    }

    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const comment = await Comment.create({
      reel: reel._id,
      author: req.user._id,
      text: text.trim(),
    });

    reel.commentsCount = (reel.commentsCount || 0) + 1;
    await reel.save();

    const populated = await Comment.findById(comment._id).populate(
      'author',
      'fullName username profilePicture'
    );

    res.status(201).json({
      success: true,
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reel
// @route   DELETE /api/reels/:id
// @access  Private
const deleteReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    if (reel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this content.',
      });
    }

    // 1. Delete associated comments
    await Comment.deleteMany({ reel: reel._id });

    // 2. Remove from users' savedReels
    await User.updateMany(
      { savedReels: reel._id },
      { $pull: { savedReels: reel._id } }
    );

    // 3. Remove related notifications
    await Notification.deleteMany({ reel: reel._id });

    // 4. Safe media cleanup
    await cleanupMedia([reel.video, reel.thumbnail].filter(Boolean), req.user._id);

    // 5. Delete reel from database
    await Reel.findByIdAndDelete(req.params.id);

    // 6. Audit log
    await AuditLog.create({
      userId: req.user._id,
      contentType: 'reel',
      contentId: reel._id,
      action: 'delete',
      details: { caption: reel.caption?.slice(0, 80) },
    });

    // 7. Real-time broadcast
    if (req.io) {
      req.io.emit('reel:deleted', { reelId: reel._id });
    }

    res.status(200).json({
      success: true,
      message: 'Reel deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReelsFeed,
  getUserReels,
  getSavedReels,
  createReel,
  toggleLike,
  recordView,
  toggleSave,
  getComments,
  addComment,
  deleteReel,
};
