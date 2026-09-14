const Story = require('../models/Story');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// @desc    Get active stories grouped by user
// @route   GET /api/stories
// @access  Private
const getStories = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const now = new Date();

    // Get list of followed authors
    const follows = await Follow.find({ follower: currentUserId, status: 'accepted' });
    const followedIds = new Set(follows.map((f) => f.following.toString()));

    const rawStories = await Story.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: 1 })
      .populate('author', 'fullName username profilePicture isPrivate')
      .populate('viewers.user', 'fullName username profilePicture');

    // Filter out stories from private authors who are not followed
    const activeStories = rawStories.filter((story) => {
      const author = story.author;
      if (!author) return false;
      const authorId = author._id.toString();
      if (authorId === currentUserId.toString()) return true;
      if (author.isPrivate && !followedIds.has(authorId)) return false;
      return true;
    });

    // Group stories by author ID
    const groupedMap = new Map();

    activeStories.forEach((story) => {
      const authorId = story.author._id.toString();
      if (!groupedMap.has(authorId)) {
        groupedMap.set(authorId, {
          user: story.author,
          stories: [],
          hasUnviewed: false,
        });
      }

      const group = groupedMap.get(authorId);
      const isViewed = story.viewers.some(
        (v) => v.user && (v.user._id || v.user).toString() === currentUserId.toString()
      );

      if (!isViewed && authorId !== currentUserId.toString()) {
        group.hasUnviewed = true;
      }

      group.stories.push({
        ...story.toObject(),
        isViewed,
      });
    });

    const groups = Array.from(groupedMap.values());

    // Sort: current user's group first, then unviewed, then viewed
    groups.sort((a, b) => {
      if (a.user._id.toString() === currentUserId.toString()) return -1;
      if (b.user._id.toString() === currentUserId.toString()) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    res.status(200).json({
      success: true,
      count: groups.length,
      storyGroups: groups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create story
// @route   POST /api/stories
// @access  Private
const createStory = async (req, res, next) => {
  try {
    const media = req.body.media || req.body.mediaUrl || '';
    const text = req.body.text || req.body.caption || '';
    const { mediaType, mentions, visibility } = req.body;

    if (!media && !text) {
      return res.status(400).json({ success: false, message: 'Story media or text is required.' });
    }

    const story = await Story.create({
      author: req.user._id,
      media: media || '',
      mediaType: mediaType || 'image',
      text: text || '',
      mentions: mentions || [],
      visibility: visibility || 'everyone',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const populated = await Story.findById(story._id).populate(
      'author',
      'fullName username profilePicture'
    );

    res.status(201).json({
      success: true,
      story: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark story as viewed
// @route   POST /api/stories/:id/view
// @access  Private
const viewStory = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    const alreadyViewed = story.viewers.some(
      (v) => (v.user || '').toString() === currentUserId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: currentUserId,
        viewedAt: new Date(),
      });
      await story.save();
    }

    res.status(200).json({
      success: true,
      viewersCount: story.viewers.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to story
// @route   POST /api/stories/:id/react
// @access  Private
const reactToStory = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji reaction is required.' });
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    story.reactions.push({
      user: currentUserId,
      emoji,
      createdAt: new Date(),
    });
    await story.save();

    // Create notification
    if (story.author.toString() !== currentUserId.toString()) {
      await Notification.create({
        user: story.author,
        sender: currentUserId,
        type: 'reaction',
        message: `${req.user.fullName} reacted ${emoji} to your story`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reaction sent.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to story via ChatFlow direct message
// @route   POST /api/stories/:id/reply
// @access  Private
const replyToStory = async (req, res, next) => {
  try {
    const { messageText } = req.body;
    const currentUserId = req.user._id;

    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text cannot be empty.' });
    }

    const story = await Story.findById(req.params.id).populate('author');
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    const recipientId = story.author._id;
    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot reply to your own story.' });
    }

    // Get or create direct conversation
    let conv = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    });

    if (!conv) {
      conv = await Conversation.create({
        type: 'direct',
        participants: [currentUserId, recipientId],
      });
    }

    // Create message referencing the story
    const msg = await Message.create({
      conversation: conv._id,
      sender: currentUserId,
      receiver: recipientId,
      text: `Replied to your story: "${messageText.trim()}"`,
      attachments: story.media
        ? [{ fileType: story.mediaType || 'image', url: story.media, name: 'Story' }]
        : [],
      status: 'sent',
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    conv.lastMessage = msg._id;
    await conv.save();

    res.status(200).json({
      success: true,
      message: 'Story reply sent to chat.',
      conversationId: conv._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete story
// @route   DELETE /api/stories/:id
// @access  Private
const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own stories.',
      });
    }

    await Story.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Story deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get viewers for a story (author only)
// @route   GET /api/stories/:id/viewers
// @access  Private
const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate(
      'viewers.user',
      'fullName username profilePicture'
    );
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }
    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the story author can view viewers.',
      });
    }

    res.status(200).json({
      success: true,
      count: story.viewers.length,
      viewers: story.viewers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStories,
  createStory,
  viewStory,
  getStoryViewers,
  reactToStory,
  replyToStory,
  deleteStory,
};
