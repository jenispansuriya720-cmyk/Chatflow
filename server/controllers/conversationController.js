const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get all conversations for logged in user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: { $in: [userId] },
    })
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'fullName username profilePicture',
        },
      })
      .populate('admins', 'fullName username profilePicture')
      .sort({ updatedAt: -1 });

    const convIds = conversations.map((c) => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          sender: { $ne: userId },
          'readBy.user': { $ne: userId },
          deletedFor: { $ne: userId },
        },
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = new Map();
    unreadAgg.forEach((u) => {
      unreadMap.set(u._id.toString(), u.count);
    });

    // Calculate unread counts and flags for each conversation
    const conversationsWithUnread = conversations.map((conv) => {
      const unreadCount = unreadMap.get(conv._id.toString()) || 0;
      const isPinned = (conv.pinnedBy || []).some(
        (p) => p.toString() === userId.toString()
      );
      const isMuted = (conv.mutedBy || []).some(
        (m) => m.toString() === userId.toString()
      );

      return {
        ...conv.toObject(),
        unreadCount,
        isPinned,
        isMuted,
      };
    });

    // Sort pinned conversations to the top, then by latest update
    conversationsWithUnread.sort((a, b) => {
      if (a.isPinned === b.isPinned) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return a.isPinned ? -1 : 1;
    });

    res.status(200).json({
      success: true,
      count: conversationsWithUnread.length,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create direct conversation
// @route   POST /api/conversations/direct/:participantId
// @access  Private
const getOrCreateDirect = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const participantId = req.params.participantId || req.body.participantId || req.body.recipientId;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required.',
      });
    }

    if (userId.toString() === participantId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a direct conversation with yourself.',
      });
    }

    const recipient = await User.findById(participantId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    // Check blocked status
    if (req.user.blockedUsers.includes(participantId)) {
      return res.status(400).json({
        success: false,
        message: 'You have blocked this user. Unblock to start messaging.',
      });
    }

    if (recipient.blockedUsers && recipient.blockedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot message this user because you are blocked.',
      });
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, participantId], $size: 2 },
    })
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, participantId],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'fullName username email profilePicture isOnline lastSeen'
      );
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new group conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { groupName, groupDescription, groupImage, participants } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    let participantList = Array.isArray(participants) ? [...participants] : [];
    // Ensure creator is included
    if (!participantList.includes(userId.toString())) {
      participantList.push(userId.toString());
    }

    if (participantList.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'A group must have at least 2 members.',
      });
    }

    const defaultImage =
      groupImage ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

    const group = await Conversation.create({
      type: 'group',
      groupName: groupName.trim(),
      groupDescription: groupDescription || '',
      groupImage: defaultImage,
      participants: participantList,
      admins: [userId],
    });

    const populatedGroup = await Conversation.findById(group._id)
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate('admins', 'fullName username profilePicture');

    // Create system message welcoming to group
    const systemMsg = await Message.create({
      conversation: group._id,
      sender: userId,
      text: `${req.user.fullName} created the group "${groupName}".`,
      status: 'sent',
    });

    populatedGroup.lastMessage = systemMsg._id;
    await populatedGroup.save();

    const finalGroup = await Conversation.findById(group._id)
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate('admins', 'fullName username profilePicture')
      .populate('lastMessage');

    if (req.io) {
      participantList.forEach((pid) => {
        req.io.to(`user:${pid}`).emit('conversationCreated', finalGroup);
        req.io.to(`user:${pid}`).emit('conversation:created', finalGroup);
      });
      req.io.to(`conversation:${group._id}`).emit('receiveMessage', systemMsg);
      req.io.to(`conversation:${group._id}`).emit('message:new', systemMsg);
    }

    res.status(201).json({
      success: true,
      conversation: finalGroup || populatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: { $in: [userId] },
    })
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate('admins', 'fullName username profilePicture')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a member.',
      });
    }

    const isPinned = conversation.pinnedBy.some(
      (p) => p.toString() === userId.toString()
    );
    const isMuted = conversation.mutedBy.some(
      (m) => m.toString() === userId.toString()
    );

    res.status(200).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        isPinned,
        isMuted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update group conversation details / members / admins
// @route   PUT /api/conversations/:id
// @access  Private (Group Admins only)
const updateGroup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { groupName, groupDescription, groupImage, addParticipants, removeParticipants, promoteAdmin, demoteAdmin } = req.body;

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group conversation not found.' });
    }

    const isAdmin = conversation.admins.some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can update group settings or members.',
      });
    }

    if (groupName) conversation.groupName = groupName.trim();
    if (groupDescription !== undefined) conversation.groupDescription = groupDescription;
    if (groupImage) conversation.groupImage = groupImage;

    // Add participants
    if (Array.isArray(addParticipants) && addParticipants.length > 0) {
      addParticipants.forEach((pId) => {
        if (!conversation.participants.some((p) => p.toString() === pId.toString())) {
          conversation.participants.push(pId);
        }
      });
    }

    // Remove participants
    if (Array.isArray(removeParticipants) && removeParticipants.length > 0) {
      conversation.participants = conversation.participants.filter(
        (p) => !removeParticipants.includes(p.toString())
      );
      // Also remove from admins if removed
      conversation.admins = conversation.admins.filter(
        (a) => !removeParticipants.includes(a.toString())
      );
    }

    // Promote admin
    if (promoteAdmin && !conversation.admins.some((a) => a.toString() === promoteAdmin.toString())) {
      conversation.admins.push(promoteAdmin);
    }

    // Demote admin
    if (demoteAdmin) {
      if (conversation.admins.length <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only admin of the group.',
        });
      }
      conversation.admins = conversation.admins.filter(
        (a) => a.toString() !== demoteAdmin.toString()
      );
    }

    await conversation.save();

    const updated = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName username email profilePicture isOnline lastSeen')
      .populate('admins', 'fullName username profilePicture');

    res.status(200).json({
      success: true,
      message: 'Group updated successfully.',
      conversation: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave group
// @route   POST /api/conversations/:id/leave
// @access  Private
const leaveGroup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId.toString()
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== userId.toString()
    );

    // If no admins left and members exist, assign the first member as admin
    if (conversation.admins.length === 0 && conversation.participants.length > 0) {
      conversation.admins.push(conversation.participants[0]);
    }

    await conversation.save();

    // Create system notification message
    await Message.create({
      conversation: conversation._id,
      sender: userId,
      text: `${req.user.fullName} left the group.`,
      status: 'sent',
    });

    res.status(200).json({
      success: true,
      message: 'You have left the group.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin conversation
// @route   PUT /api/conversations/:id/pin
// @access  Private
const togglePin = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isPinned = conversation.pinnedBy.some((p) => p.toString() === userId.toString());

    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(
        (p) => p.toString() !== userId.toString()
      );
    } else {
      conversation.pinnedBy.push(userId);
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      isPinned: !isPinned,
      message: !isPinned ? 'Chat pinned.' : 'Chat unpinned.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle mute conversation
// @route   PUT /api/conversations/:id/mute
// @access  Private
const toggleMute = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isMuted = conversation.mutedBy.some((m) => m.toString() === userId.toString());

    if (isMuted) {
      conversation.mutedBy = conversation.mutedBy.filter(
        (m) => m.toString() !== userId.toString()
      );
    } else {
      conversation.mutedBy.push(userId);
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      isMuted: !isMuted,
      message: !isMuted ? 'Chat muted.' : 'Chat unmuted.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete conversation
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // For direct chat, delete conversation and its messages
    await Message.deleteMany({ conversation: req.params.id });
    await Conversation.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getOrCreateDirect,
  createGroup,
  getConversationById,
  updateGroup,
  leaveGroup,
  togglePin,
  toggleMute,
  deleteConversation,
};
