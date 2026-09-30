const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const { cleanupMedia } = require('../utils/mediaCleanup');

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages from this conversation.',
      });
    }

    const query = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
    };

    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'fullName username profilePicture')
      .populate({
        path: 'replyTo',
        select: 'text sender attachments isDeleted',
        populate: {
          path: 'sender',
          select: 'fullName username',
        },
      })
      .populate('reactions.user', 'fullName username profilePicture');

    // Automatically mark unread messages as read upon viewing
    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    }).select('_id sender');

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m._id);
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        {
          $addToSet: { readBy: { user: userId, readAt: new Date() } },
          $set: { status: 'read', readAt: new Date() },
        }
      );

      if (req.io) {
        req.io.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          userId,
          messageIds: unreadIds,
          readAt: new Date(),
        });
      }
    }

    // Check shared content status (bulk check to eliminate N+1 queries)
    const postIdsToCheck = [];
    const reelIdsToCheck = [];
    const storyIdsToCheck = [];

    messages.forEach((msg) => {
      if (msg.sharedContent && msg.sharedContent.contentId) {
        if (msg.sharedContent.contentType === 'post') postIdsToCheck.push(msg.sharedContent.contentId);
        else if (msg.sharedContent.contentType === 'reel') reelIdsToCheck.push(msg.sharedContent.contentId);
        else if (msg.sharedContent.contentType === 'story') storyIdsToCheck.push(msg.sharedContent.contentId);
      }
    });

    const [existingPosts, existingReels, existingStories] = await Promise.all([
      postIdsToCheck.length > 0 ? Post.find({ _id: { $in: postIdsToCheck } }).select('_id').lean() : [],
      reelIdsToCheck.length > 0 ? Reel.find({ _id: { $in: reelIdsToCheck } }).select('_id').lean() : [],
      storyIdsToCheck.length > 0 ? Story.find({ _id: { $in: storyIdsToCheck } }).select('_id').lean() : [],
    ]);

    const existingPostIds = new Set(existingPosts.map((p) => p._id.toString()));
    const existingReelIds = new Set(existingReels.map((r) => r._id.toString()));
    const existingStoryIds = new Set(existingStories.map((s) => s._id.toString()));

    const processedMessages = messages.map((msg) => {
      const m = msg.toObject();
      if (m.sharedContent && m.sharedContent.contentId) {
        const cId = m.sharedContent.contentId.toString();
        const { contentType } = m.sharedContent;
        let exists = false;
        if (contentType === 'post') exists = existingPostIds.has(cId);
        else if (contentType === 'reel') exists = existingReelIds.has(cId);
        else if (contentType === 'story') exists = existingStoryIds.has(cId);

        if (!exists) {
          m.sharedContent.isUnavailable = true;
        }
      }
      return m;
    });

    res.status(200).json({
      success: true,
      count: processedMessages.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      messages: processedMessages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message with duplicate prevention
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { conversationId, attachments, voiceData, replyTo, clientMessageId, type, sharedContent, pollData, eventData } = req.body;
    const text = req.body.text || req.body.content || '';

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required.' });
    }

    if (!text && (!attachments || attachments.length === 0) && !voiceData && !sharedContent && !pollData && !eventData) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain text, an attachment, voice data, or shared content.',
      });
    }

    // 1. Duplicate Prevention via clientMessageId
    if (clientMessageId) {
      const existingMsg = await Message.findOne({
        conversation: conversationId,
        sender: senderId,
        clientMessageId,
      })
        .populate('sender', 'fullName username profilePicture')
        .populate({
          path: 'replyTo',
          select: 'text sender attachments isDeleted',
          populate: { path: 'sender', select: 'fullName username' },
        });

      if (existingMsg) {
        return res.status(200).json({
          success: true,
          message: existingMsg,
          isDuplicate: true,
        });
      }
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (!conversation.participants.some((p) => p.toString() === senderId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation.',
      });
    }

    // Determine receiver for direct chats
    let receiverId = null;
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.toString() !== senderId.toString()
      );
      receiverId = otherParticipant;

      // Check if sender blocked receiver
      if (req.user.blockedUsers && req.user.blockedUsers.includes(receiverId)) {
        return res.status(403).json({
          success: false,
          code: 'USER_BLOCKED',
          message: 'You have blocked this user. Unblock to message.',
        });
      }

      // Check if receiver blocked sender
      const recipientUser = await User.findById(receiverId);
      if (recipientUser && recipientUser.blockedUsers && recipientUser.blockedUsers.includes(senderId)) {
        return res.status(403).json({
          success: false,
          code: 'BLOCKED_BY_USER',
          message: 'You cannot send messages to this user because you are blocked.',
        });
      }
    }

    const newMessage = await Message.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiverId,
      clientMessageId: clientMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: type || (sharedContent ? `shared_${sharedContent.contentType}` : voiceData ? 'voice' : attachments?.length ? 'media' : 'text'),
      text: text || '',
      attachments: attachments || [],
      voiceData: voiceData || { duration: 0, waveform: [] },
      sharedContent: sharedContent || undefined,
      pollData: pollData || undefined,
      eventData: eventData || undefined,
      replyTo: replyTo || null,
      status: 'sent',
      sentAt: new Date(),
      readBy: [{ user: senderId, readAt: new Date() }],
    });

    conversation.lastMessage = newMessage._id;
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'fullName username profilePicture')
      .populate({
        path: 'replyTo',
        select: 'text sender attachments isDeleted',
        populate: {
          path: 'sender',
          select: 'fullName username',
        },
      });

    // Real-time delivery via Socket.IO
    if (req.io) {
      req.io.to(`conversation:${conversationId}`).emit('receiveMessage', populatedMessage);
      req.io.to(`conversation:${conversationId}`).emit('message:new', populatedMessage);

      if (receiverId) {
        req.io.to(`user:${receiverId}`).emit('receiveMessage', populatedMessage);
        req.io.to(`user:${receiverId}`).emit('message:new', populatedMessage);
        req.io.to(`user:${receiverId}`).emit('notification', {
          type: 'message',
          message: populatedMessage,
        });
      }
    }

    // Create notifications for other participants
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== senderId.toString()) {
        await Notification.create({
          user: participantId,
          sender: senderId,
          type: 'message',
          message: `${req.user.fullName}: ${text ? text.slice(0, 50) : 'Sent an attachment'}`,
          conversationId,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as delivered
// @route   PUT /api/messages/delivered/:conversationId
// @access  Private
const markAsDelivered = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { messageIds } = req.body;

    const filter = {
      conversation: conversationId,
      sender: { $ne: userId },
      status: 'sent',
    };

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      filter._id = { $in: messageIds };
    }

    const messagesToUpdate = await Message.find(filter).select('_id sender');
    if (messagesToUpdate.length > 0) {
      const ids = messagesToUpdate.map((m) => m._id);
      const deliveredTime = new Date();

      await Message.updateMany(
        { _id: { $in: ids } },
        {
          $set: { status: 'delivered', deliveredAt: deliveredTime },
        }
      );

      // Notify senders in real time
      if (req.io) {
        req.io.to(`conversation:${conversationId}`).emit('message:delivered', {
          conversationId,
          messageIds: ids,
          deliveredAt: deliveredTime,
        });

        // Also emit directly to sender rooms
        const senderIds = [...new Set(messagesToUpdate.map((m) => m.sender.toString()))];
        senderIds.forEach((sId) => {
          req.io.to(`user:${sId}`).emit('message:delivered', {
            conversationId,
            messageIds: ids,
            deliveredAt: deliveredTime,
          });
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as delivered.',
      deliveredCount: messagesToUpdate.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync undelivered messages when user connects/logs in
// @route   POST /api/messages/sync-undelivered
// @access  Private
const syncUndelivered = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find conversations user is part of
    const userConversations = await Conversation.find({
      participants: { $in: [userId] },
    }).select('_id');

    const convIds = userConversations.map((c) => c._id);

    // Find sent messages where recipient is this user or in these conversations
    const undeliveredMessages = await Message.find({
      conversation: { $in: convIds },
      sender: { $ne: userId },
      status: 'sent',
    }).select('_id sender conversation');

    if (undeliveredMessages.length > 0) {
      const ids = undeliveredMessages.map((m) => m._id);
      const deliveredTime = new Date();

      await Message.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'delivered', deliveredAt: deliveredTime } }
      );

      // Group by sender and notify them
      if (req.io) {
        undeliveredMessages.forEach((m) => {
          req.io.to(`user:${m.sender}`).emit('message:delivered', {
            conversationId: m.conversation,
            messageIds: [m._id],
            deliveredAt: deliveredTime,
          });
        });
      }
    }

    res.status(200).json({
      success: true,
      syncedCount: undeliveredMessages.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark conversation messages as read
// @route   PUT /api/messages/read/:conversationId
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const readTime = new Date();

    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    }).select('_id sender');

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m._id);

      await Message.updateMany(
        { _id: { $in: unreadIds } },
        {
          $addToSet: { readBy: { user: userId, readAt: readTime } },
          $set: { status: 'read', readAt: readTime },
        }
      );

      if (req.io) {
        req.io.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          userId,
          messageIds: unreadIds,
          readAt: readTime,
        });

        req.io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId,
          messageIds: unreadIds,
          readAt: readTime,
        });

        // Notify senders directly
        const senderIds = [...new Set(unreadMessages.map((m) => m.sender.toString()))];
        senderIds.forEach((sId) => {
          req.io.to(`user:${sId}`).emit('message:read', {
            conversationId,
            userId,
            messageIds: unreadIds,
            readAt: readTime,
          });
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
      readCount: unreadMessages.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
const editMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Updated text cannot be empty.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages.',
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a deleted message.',
      });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'fullName username profilePicture')
      .populate({
        path: 'replyTo',
        select: 'text sender attachments isDeleted',
        populate: { path: 'sender', select: 'fullName username' },
      });

    if (req.io) {
      req.io.to(`conversation:${message.conversation}`).emit('messageEdited', populated);
      req.io.to(`conversation:${message.conversation}`).emit('message:edited', populated);
    }

    res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (for me OR for everyone)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const deleteType = req.body?.deleteType || req.query?.deleteType || 'for_everyone';
    const isEveryone = deleteType === 'for_everyone' || deleteType === 'everyone';

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (isEveryone) {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to delete this content.',
        });
      }

      // Safe cleanup of attachments/voice media if stored
      if (message.attachments && message.attachments.length > 0) {
        await cleanupMedia(message.attachments.map((a) => a.url), userId);
      }

      message.text = 'This message was deleted';
      message.attachments = [];
      message.voiceData = { duration: 0, waveform: [] };
      message.sharedContent = undefined;
      message.pollData = undefined;
      message.eventData = undefined;
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = userId;
      await message.save();

      // Audit logging
      await AuditLog.create({
        userId,
        contentType: 'message',
        contentId: message._id,
        action: 'soft_delete',
        details: { conversationId: message.conversation, deleteType: 'for_everyone' },
      });

      if (req.io) {
        req.io.to(`conversation:${message.conversation}`).emit('messageDeleted', {
          conversationId: message.conversation,
          messageId: message._id,
          deleteType: 'for_everyone',
        });
        req.io.to(`conversation:${message.conversation}`).emit('message:deleted', {
          conversationId: message.conversation,
          messageId: message._id,
          deleteType: 'for_everyone',
        });
        if (message.receiver) {
          req.io.to(`user:${message.receiver}`).emit('message:deleted', {
            conversationId: message.conversation,
            messageId: message._id,
            deleteType: 'for_everyone',
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted for everyone.',
        deletedMessage: message,
      });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      // Audit logging
      await AuditLog.create({
        userId,
        contentType: 'message',
        contentId: message._id,
        action: 'delete_for_me',
        details: { conversationId: message.conversation },
      });

      return res.status(200).json({
        success: true,
        message: 'Message deleted for you.',
        messageId: message._id,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    React to a message
// @route   POST /api/messages/:id/react
// @access  Private
const reactToMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji reaction is required.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== userId.toString()
      );
      message.reactions.push({ emoji, user: userId });

      if (message.sender.toString() !== userId.toString()) {
        await Notification.create({
          user: message.sender,
          sender: userId,
          type: 'reaction',
          message: `${req.user.fullName} reacted ${emoji} to your message`,
          conversationId: message.conversation,
        });
      }
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'fullName username profilePicture')
      .populate('reactions.user', 'fullName username profilePicture');

    if (req.io) {
      req.io.to(`conversation:${message.conversation}`).emit('messageReaction', {
        conversationId: message.conversation,
        messageId: message._id,
        reactions: populated.reactions,
      });
      req.io.to(`conversation:${message.conversation}`).emit('message:reaction', {
        conversationId: message.conversation,
        messageId: message._id,
        reactions: populated.reactions,
      });
    }

    res.status(200).json({
      success: true,
      reactions: populated.reactions,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forward a message to another conversation
// @route   POST /api/messages/:id/forward
// @access  Private
const forwardMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { targetConversationId } = req.body;

    const sourceMessage = await Message.findById(req.params.id);
    if (!sourceMessage || sourceMessage.isDeleted) {
      return res.status(404).json({ success: false, message: 'Message not found or deleted.' });
    }

    const targetConv = await Conversation.findOne({
      _id: targetConversationId,
      participants: { $in: [userId] },
    });

    if (!targetConv) {
      return res.status(403).json({
        success: false,
        message: 'Target conversation not found or you are not a member.',
      });
    }

    const forwardedMessage = await Message.create({
      conversation: targetConversationId,
      sender: userId,
      text: sourceMessage.text,
      attachments: sourceMessage.attachments,
      voiceData: sourceMessage.voiceData,
      status: 'sent',
      sentAt: new Date(),
      readBy: [{ user: userId, readAt: new Date() }],
    });

    targetConv.lastMessage = forwardedMessage._id;
    await targetConv.save();

    const populated = await Message.findById(forwardedMessage._id)
      .populate('sender', 'fullName username profilePicture');

    if (req.io) {
      req.io.to(`conversation:${targetConversationId}`).emit('receiveMessage', populated);
      req.io.to(`conversation:${targetConversationId}`).emit('message:new', populated);
    }

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
  markAsDelivered,
  syncUndelivered,
  forwardMessage,
};
