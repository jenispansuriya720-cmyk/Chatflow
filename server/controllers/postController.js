const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const { cleanupMedia } = require('../utils/mediaCleanup');

// @desc    Get social feed
// @route   GET /api/posts/feed
// @access  Private
const getFeed = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get list of followed user IDs
    const follows = await Follow.find({ follower: userId, status: 'accepted' }).select('following').lean();
    const followingIds = follows.map((f) => f.following);
    followingIds.push(userId); // include own posts

    // Identify private users not followed by current user
    const unallowedPrivateUsers = await User.find({
      isPrivate: true,
      _id: { $nin: followingIds },
    }).select('_id').lean();
    const unallowedPrivateIds = unallowedPrivateUsers.map((u) => u._id);

    // Query: either posts from following or public posts from non-private accounts
    let query = {
      $or: [
        { author: { $in: followingIds } },
        { visibility: 'public', author: { $nin: unallowedPrivateIds } },
      ],
    };

    if (req.query.tag) {
      const cleanTag = req.query.tag.replace('#', '').toLowerCase();
      query = {
        hashtags: cleanTag,
        visibility: 'public',
        author: { $nin: unallowedPrivateIds },
      };
    } else if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      query = {
        $or: [{ content: regex }, { hashtags: regex }],
        visibility: 'public',
        author: { $nin: unallowedPrivateIds },
      };
    }

    const total = await Post.countDocuments(query);
    const [posts, user] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'fullName username profilePicture bio isPrivate')
        .populate('mentions', 'fullName username')
        .lean(),
      User.findById(userId).select('savedPosts').lean(),
    ]);

    const savedSet = new Set((user?.savedPosts || []).map((id) => id.toString()));
    const postsWithFlags = posts.map((post) => {
      const isLiked = (post.likes || []).some(
        (id) => id.toString() === userId.toString()
      );
      const isSaved = savedSet.has(post._id.toString());
      const likesCount = post.likes ? post.likes.length : 0;
      return {
        ...post,
        isLiked,
        isSaved,
        likesCount,
      };
    });

    res.status(200).json({
      success: true,
      count: postsWithFlags.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts: postsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's saved/bookmarked posts
// @route   GET /api/posts/saved
// @access  Private
const getSavedPosts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('savedPosts').lean();
    const savedIds = user?.savedPosts || [];

    const posts = await Post.find({ _id: { $in: savedIds } })
      .sort({ createdAt: -1 })
      .populate('author', 'fullName username profilePicture')
      .lean();

    const postsWithFlags = posts.map((post) => {
      const isLiked = (post.likes || []).some(
        (id) => id.toString() === req.user._id.toString()
      );
      return {
        ...post,
        isLiked,
        isSaved: true,
        likesCount: post.likes ? post.likes.length : 0,
      };
    });

    res.status(200).json({
      success: true,
      count: postsWithFlags.length,
      posts: postsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Private
const getUserPosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(userId).select('isPrivate').lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If target is private and not self, check if follower
    if (targetUser.isPrivate && userId.toString() !== currentUserId.toString()) {
      const isAcceptedFollower = await Follow.findOne({
        follower: currentUserId,
        following: userId,
        status: 'accepted',
      }).lean();

      if (!isAcceptedFollower) {
        return res.status(200).json({
          success: true,
          count: 0,
          isPrivate: true,
          posts: [],
        });
      }
    }

    const [posts, user] = await Promise.all([
      Post.find({ author: userId })
        .sort({ createdAt: -1 })
        .populate('author', 'fullName username profilePicture isPrivate')
        .lean(),
      User.findById(currentUserId).select('savedPosts').lean(),
    ]);

    const savedSet = new Set((user?.savedPosts || []).map((id) => id.toString()));
    const postsWithFlags = posts.map((post) => {
      const isLiked = (post.likes || []).some(
        (id) => id.toString() === currentUserId.toString()
      );
      const isSaved = savedSet.has(post._id.toString());
      return {
        ...post,
        isLiked,
        isSaved,
        likesCount: post.likes ? post.likes.length : 0,
      };
    });

    res.status(200).json({
      success: true,
      count: postsWithFlags.length,
      isPrivate: false,
      posts: postsWithFlags,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'fullName username profilePicture')
      .populate('mentions', 'fullName username');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const isLiked = (post.likes || []).some(
      (id) => id.toString() === req.user._id.toString()
    );
    const isSaved = (req.user?.savedPosts || []).some(
      (id) => id.toString() === post._id.toString()
    );

    res.status(200).json({
      success: true,
      post: {
        ...post.toObject(),
        isLiked,
        isSaved,
        likesCount: post.likes ? post.likes.length : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res, next) => {
  try {
    const { content, media, location, hashtags, mentions, visibility } = req.body;

    if (!content && (!media || media.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Post must contain text content or media.',
      });
    }

    // Parse hashtags from text if not explicitly provided
    let tags = Array.isArray(hashtags) ? hashtags : [];
    if (content && tags.length === 0) {
      const match = content.match(/#[a-z0-9_]+/gi);
      if (match) {
        tags = match.map((t) => t.replace('#', '').toLowerCase());
      }
    }

    const post = await Post.create({
      author: req.user._id,
      content: content || '',
      media: media || [],
      location: location || '',
      hashtags: tags,
      mentions: mentions || [],
      visibility: visibility || 'public',
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });

    const populated = await Post.findById(post._id).populate(
      'author',
      'fullName username profilePicture'
    );

    res.status(201).json({
      success: true,
      post: {
        ...populated.toObject(),
        isLiked: false,
        isSaved: false,
        likesCount: 0,
      },
    });
  } catch (error) {
    if (req.body?.media && Array.isArray(req.body.media)) {
      const urls = req.body.media.map((m) => m.url || m).filter(Boolean);
      if (urls.length > 0) {
        await cleanupMedia(urls, req.user._id).catch(() => {});
      }
    }
    next(error);
  }
};

// @desc    Like / Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { action } = req.body || {}; // 'like' | 'unlike' | undefined
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const hasLiked = post.likes.some(
      (id) => id.toString() === userId.toString()
    );

    let isLikedNow = hasLiked;

    if (action === 'like') {
      // Idempotent like: keep liked if already liked (e.g. double-tap)
      if (!hasLiked) {
        post.likes.push(userId);
        isLikedNow = true;

        if (post.author.toString() !== userId.toString()) {
          const notif = await Notification.create({
            user: post.author,
            sender: userId,
            type: 'like',
            message: `${req.user.fullName} liked your post.`,
          });
          if (req.io) {
            req.io.to(`user:${post.author}`).emit('new_notification', notif);
          }
        }
        await post.save();
      }
    } else if (action === 'unlike') {
      // Idempotent unlike
      if (hasLiked) {
        post.likes = post.likes.filter(
          (id) => id.toString() !== userId.toString()
        );
        isLikedNow = false;
        await post.save();
      }
    } else {
      // Default toggle behavior
      if (hasLiked) {
        post.likes = post.likes.filter(
          (id) => id.toString() !== userId.toString()
        );
        isLikedNow = false;
      } else {
        post.likes.push(userId);
        isLikedNow = true;

        if (post.author.toString() !== userId.toString()) {
          const notif = await Notification.create({
            user: post.author,
            sender: userId,
            type: 'like',
            message: `${req.user.fullName} liked your post.`,
          });
          if (req.io) {
            req.io.to(`user:${post.author}`).emit('new_notification', notif);
          }
        }
      }
      await post.save();
    }

    // Broadcast real-time like update via Socket.IO
    if (req.io) {
      req.io.emit('post:likeUpdated', {
        postId: post._id.toString(),
        likesCount: post.likes.length,
        userId: userId.toString(),
        isLiked: isLikedNow,
      });
    }

    res.status(200).json({
      success: true,
      isLiked: isLikedNow,
      likesCount: post.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save / Unsave post
// @route   POST /api/posts/:id/save
// @access  Private
const toggleSave = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const isSaved = (user.savedPosts || []).some(
      (id) => id.toString() === req.params.id
    );

    if (isSaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== req.params.id
      );
    } else {
      user.savedPosts.push(req.params.id);
    }

    await user.save();

    res.status(200).json({
      success: true,
      isSaved: !isSaved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
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

// @desc    Add comment to post
// @route   POST /api/posts/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { text, parentComment } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      parentComment: parentComment || null,
      text: text.trim(),
    });

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    const populated = await Comment.findById(comment._id).populate(
      'author',
      'fullName username profilePicture'
    );

    // Notify post author if not self
    if (post.author.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        user: post.author,
        sender: req.user._id,
        type: 'comment',
        message: `${req.user.fullName} commented on your post: "${text.slice(0, 40)}"`,
      });
      if (req.io) {
        req.io.to(`user:${post.author}`).emit('new_notification', notif);
      }
    }

    res.status(201).json({
      success: true,
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this content.',
      });
    }

    // 1. Delete associated comments
    await Comment.deleteMany({ post: post._id });

    // 2. Remove from all users' savedPosts
    await User.updateMany(
      { savedPosts: post._id },
      { $pull: { savedPosts: post._id } }
    );

    // 3. Remove related notifications
    await Notification.deleteMany({ post: post._id });

    // 4. Safe media cleanup
    if (post.media && post.media.length > 0) {
      await cleanupMedia(
        post.media.map((m) => m.url),
        req.user._id
      );
    }

    // 5. Decrement author post count
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });

    // 6. Delete post from database
    await Post.findByIdAndDelete(post._id);

    // 7. Audit log
    await AuditLog.create({
      userId: req.user._id,
      contentType: 'post',
      contentId: post._id,
      action: 'delete',
      details: { contentPreview: post.content?.slice(0, 80) },
    });

    // 8. Real-time broadcast
    if (req.io) {
      req.io.emit('post:deleted', { postId: post._id });
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Share post to a ChatFlow conversation
// @route   POST /api/posts/:id/share
// @access  Private
const sharePostToChat = async (req, res, next) => {
  try {
    const targetConversationId = req.body.targetConversationId || req.body.conversationId;
    const post = await Post.findById(req.params.id).populate('author', 'fullName username profilePicture');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const conversation = await Conversation.findOne({
      _id: targetConversationId,
      participants: { $in: [req.user._id] },
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Target conversation not found or you are not a member.',
      });
    }

    const shareText = `Shared post from @${post.author.username}: "${post.content ? post.content.slice(0, 100) : 'Photo/Video'}"`;

    const sharedContent = {
      contentType: 'post',
      contentId: post._id,
      authorName: post.author.fullName,
      authorUsername: post.author.username,
      titleOrCaption: post.content ? post.content.slice(0, 150) : '',
      thumbnailUrl: post.media?.[0]?.url || '',
      mediaUrl: post.media?.[0]?.url || '',
    };

    const sharedAttachments = post.media?.length > 0
      ? [
          {
            fileType: post.media[0].fileType || 'image',
            url: post.media[0].url,
            name: `Post by @${post.author.username}`,
          },
        ]
      : [];

    const message = await Message.create({
      conversation: targetConversationId,
      sender: req.user._id,
      text: shareText,
      type: 'shared_post',
      sharedContent,
      attachments: sharedAttachments,
      status: 'sent',
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    post.sharesCount = (post.sharesCount || 0) + 1;
    await post.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'fullName username profilePicture');

    if (req.io) {
      req.io.to(`conversation:${targetConversationId}`).emit('receiveMessage', populated);
      req.io.to(`conversation:${targetConversationId}`).emit('message:new', populated);
    }

    res.status(200).json({
      success: true,
      message: 'Post shared to chat successfully.',
      chatMessage: populated,
      sharedMessage: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeed,
  getSavedPosts,
  getUserPosts,
  getPostById,
  createPost,
  toggleLike,
  toggleSave,
  getComments,
  addComment,
  deletePost,
  sharePostToChat,
};
