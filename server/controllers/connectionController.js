const mongoose = require('mongoose');
const Connection = require('../models/Connection');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Send a connection request to a user
// @route   POST /api/connections/:id
// @access  Private
const sendConnectionRequest = async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const recipientId = req.params.id;

    if (requesterId.toString() === recipientId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot connect with yourself.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check block list
    if (recipient.blockedUsers && recipient.blockedUsers.includes(requesterId)) {
      return res.status(403).json({ success: false, message: 'Cannot interact with this user.' });
    }
    if (req.user.blockedUsers && req.user.blockedUsers.includes(recipientId)) {
      return res.status(400).json({ success: false, message: 'You have blocked this user.' });
    }

    // Check existing connection in either direction
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Already connected with this user.' });
      }
      if (existing.status === 'pending') {
        if (existing.requester.toString() === requesterId.toString()) {
          return res.status(400).json({ success: false, message: 'Connection request already sent.' });
        } else {
          // Auto-accept if target already requested
          existing.status = 'accepted';
          await existing.save();

          const notif = await Notification.create({
            user: recipientId,
            sender: requesterId,
            type: 'connection_accept',
            message: `${req.user.fullName} accepted your connection request.`,
          });

          if (req.io) {
            req.io.to(`user:${recipientId}`).emit('new_notification', notif);
            req.io.to(`user:${recipientId}`).emit('connection_status_changed', {
              userId: requesterId,
              status: 'connected',
            });
          }

          return res.status(200).json({
            success: true,
            status: 'connected',
            message: `Connected with ${recipient.fullName}`,
          });
        }
      }
    }

    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    });

    const notif = await Notification.create({
      user: recipientId,
      sender: requesterId,
      type: 'connection_request',
      actionStatus: 'pending',
      message: `${req.user.fullName} sent you a connection request.`,
    });

    if (req.io) {
      req.io.to(`user:${recipientId}`).emit('new_notification', notif);
      req.io.to(`user:${recipientId}`).emit('connection_request_received', {
        requester: req.user,
        notification: notif,
      });
    }

    res.status(200).json({
      success: true,
      status: 'pending_sent',
      message: `Connection request sent to ${recipient.fullName}`,
      connection,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept connection request
// @route   POST /api/connections/:id/accept
// @access  Private
const acceptConnectionRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(targetId);

    const connection = await Connection.findOne({
      recipient: currentUserId,
      status: 'pending',
      $or: [
        { requester: targetId },
        ...(isObjectId ? [{ _id: targetId }] : []),
      ],
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found.' });
    }

    const requesterId = connection.requester;
    connection.status = 'accepted';
    await connection.save();

    // Update notification status
    await Notification.updateMany(
      { user: currentUserId, sender: requesterId, type: 'connection_request' },
      { actionStatus: 'accepted' }
    );

    // Notify requester
    const notif = await Notification.create({
      user: requesterId,
      sender: currentUserId,
      type: 'connection_accept',
      message: `${req.user.fullName} accepted your connection request.`,
    });

    if (req.io) {
      req.io.to(`user:${requesterId}`).emit('new_notification', notif);
      req.io.to(`user:${requesterId}`).emit('connection_status_changed', {
        userId: currentUserId,
        status: 'connected',
      });
    }

    res.status(200).json({
      success: true,
      status: 'connected',
      message: 'Connection request accepted.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject connection request
// @route   POST /api/connections/:id/reject
// @access  Private
const rejectConnectionRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(targetId);

    const connection = await Connection.findOneAndDelete({
      recipient: currentUserId,
      status: 'pending',
      $or: [
        { requester: targetId },
        ...(isObjectId ? [{ _id: targetId }] : []),
      ],
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found.' });
    }

    const requesterId = connection.requester;
    await Notification.updateMany(
      { user: currentUserId, sender: requesterId, type: 'connection_request' },
      { actionStatus: 'rejected' }
    );

    if (req.io) {
      req.io.to(`user:${requesterId}`).emit('connection_status_changed', {
        userId: currentUserId,
        status: 'none',
      });
    }

    res.status(200).json({
      success: true,
      status: 'none',
      message: 'Connection request declined.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel connection request
// @route   DELETE /api/connections/:id/cancel
// @access  Private
const cancelConnectionRequest = async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const recipientId = req.params.id;

    const connection = await Connection.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Pending connection request not found.' });
    }

    await Notification.deleteMany({
      user: recipientId,
      sender: requesterId,
      type: 'connection_request',
    });

    if (req.io) {
      req.io.to(`user:${recipientId}`).emit('connection_status_changed', {
        userId: requesterId,
        status: 'none',
      });
    }

    res.status(200).json({
      success: true,
      status: 'none',
      message: 'Connection request cancelled.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove an established connection
// @route   DELETE /api/connections/:id
// @access  Private
const removeConnection = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    const connection = await Connection.findOneAndDelete({
      $or: [
        { requester: currentUserId, recipient: targetUserId, status: 'accepted' },
        { requester: targetUserId, recipient: currentUserId, status: 'accepted' },
      ],
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found.' });
    }

    if (req.io) {
      req.io.to(`user:${targetUserId}`).emit('connection_status_changed', {
        userId: currentUserId,
        status: 'none',
      });
    }

    res.status(200).json({
      success: true,
      status: 'none',
      message: 'Connection removed.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get connection status between authenticated user and target user
// @route   GET /api/connections/:id/status
// @access  Private
const getConnectionStatus = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(200).json({ success: true, status: 'self' });
    }

    const connection = await Connection.findOne({
      $or: [
        { requester: currentUserId, recipient: targetUserId },
        { requester: targetUserId, recipient: currentUserId },
      ],
    });

    if (!connection) {
      return res.status(200).json({ success: true, status: 'none' });
    }

    if (connection.status === 'accepted') {
      return res.status(200).json({ success: true, status: 'connected' });
    }

    if (connection.status === 'pending') {
      if (connection.requester.toString() === currentUserId.toString()) {
        return res.status(200).json({ success: true, status: 'pending_sent' });
      } else {
        return res.status(200).json({ success: true, status: 'pending_received' });
      }
    }

    res.status(200).json({ success: true, status: 'none' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending connection requests for the authenticated user
// @route   GET /api/connections/requests
// @access  Private
const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await Connection.find({
      recipient: req.user._id,
      status: 'pending',
    }).populate('requester', 'fullName username profilePicture bio isOnline');

    res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests.map((r) => ({
        _id: r._id,
        user: r.requester,
        requester: r.requester,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all connections for authenticated user
// @route   GET /api/connections
// @access  Private
const getConnections = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const connections = await Connection.find({
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
      status: 'accepted',
    })
      .populate('requester', 'fullName username profilePicture bio isOnline')
      .populate('recipient', 'fullName username profilePicture bio isOnline');

    const friends = connections.map((c) => {
      const otherUser =
        c.requester._id.toString() === currentUserId.toString()
          ? c.recipient
          : c.requester;
      const userObj = otherUser?.toObject ? otherUser.toObject() : otherUser;
      return {
        ...userObj,
        user: otherUser,
        connectionId: c._id,
        createdAt: c.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: friends.length,
      connections: friends,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  removeConnection,
  getConnectionStatus,
  getPendingRequests,
  getConnections,
};
