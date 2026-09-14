const Call = require('../models/Call');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');

// @desc    Get user call history
// @route   GET /api/calls
// @access  Private
const getCalls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { filter = 'all', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {
      $or: [{ caller: userId }, { receiver: userId }],
    };

    if (filter === 'missed') {
      query.receiver = userId;
      query.status = 'missed';
    } else if (filter === 'incoming') {
      query.receiver = userId;
    } else if (filter === 'outgoing') {
      query.caller = userId;
    }

    const total = await Call.countDocuments(query);
    const calls = await Call.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('caller', 'fullName username profilePicture isOnline')
      .populate('receiver', 'fullName username profilePicture isOnline');

    res.status(200).json({
      success: true,
      count: calls.length,
      total,
      calls,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate / log a call with permission validation
// @route   POST /api/calls
// @access  Private
const initiateCall = async (req, res, next) => {
  try {
    const callerId = req.user._id;
    const { receiverId, type = 'audio' } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    if (callerId.toString() === receiverId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot call yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Check blocking
    if (req.user.blockedUsers && req.user.blockedUsers.includes(receiverId)) {
      return res.status(403).json({
        success: false,
        code: 'USER_BLOCKED',
        message: 'You have blocked this user. Unblock to call.',
      });
    }

    if (receiver.blockedUsers && receiver.blockedUsers.includes(callerId)) {
      return res.status(403).json({
        success: false,
        code: 'BLOCKED_BY_USER',
        message: 'You cannot call this user because you are blocked.',
      });
    }

    // 2. Check Receiver Settings & Call Permissions
    const receiverSettings = await UserSettings.findOne({ userId: receiverId });
    if (receiverSettings?.messages) {
      const { whoCanCall, voiceCallsEnabled, videoCallsEnabled } = receiverSettings.messages;

      if (type === 'audio' && voiceCallsEnabled === false) {
        return res.status(403).json({
          success: false,
          code: 'CALLS_DISABLED',
          message: 'This user has disabled voice calls.',
        });
      }

      if (type === 'video' && videoCallsEnabled === false) {
        return res.status(403).json({
          success: false,
          code: 'CALLS_DISABLED',
          message: 'This user has disabled video calls.',
        });
      }

      if (whoCanCall === 'nobody') {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'This user is not accepting calls.',
        });
      }

      if (whoCanCall === 'connections') {
        const isConnected = await Connection.findOne({
          $or: [
            { requester: callerId, recipient: receiverId, status: 'accepted' },
            { requester: receiverId, recipient: callerId, status: 'accepted' },
          ],
        });
        if (!isConnected) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            message: 'Only connections can call this user.',
          });
        }
      }

      if (whoCanCall === 'followers') {
        const isFollower = await Follow.findOne({
          follower: callerId,
          following: receiverId,
          status: 'accepted',
        });
        if (!isFollower) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            message: 'Only followers can call this user.',
          });
        }
      }
    }

    // Create call record
    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      type,
      status: 'calling',
      startedAt: new Date(),
    });

    const populatedCall = await Call.findById(call._id)
      .populate('caller', 'fullName username profilePicture')
      .populate('receiver', 'fullName username profilePicture');

    res.status(201).json({
      success: true,
      call: populatedCall,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End call & record duration
// @route   PUT /api/calls/:id/end
// @access  Private
const endCall = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status = 'completed', duration = 0, endedReason = 'normal' } = req.body;

    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (
      call.caller.toString() !== userId.toString() &&
      call.receiver.toString() !== userId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized for this call' });
    }

    call.status = status;
    call.duration = Math.max(0, parseInt(duration) || 0);
    call.endedAt = new Date();
    call.endedReason = endedReason;
    await call.save();

    // If missed, create notification for receiver
    if (status === 'missed') {
      await Notification.create({
        user: call.receiver,
        sender: call.caller,
        type: 'message',
        message: `Missed ${call.type} call from ${req.user.fullName}`,
      });
    }

    res.status(200).json({
      success: true,
      call,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete call record
// @route   DELETE /api/calls/:id
// @access  Private
const deleteCall = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const call = await Call.findOne({
      _id: req.params.id,
      $or: [{ caller: userId }, { receiver: userId }],
    });

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    await Call.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Call record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCalls,
  initiateCall,
  endCall,
  deleteCall,
};
