const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Follow, send request, or unfollow a user
// @route   POST /api/follow/:id
// @access  Private
const toggleFollow = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if target has blocked current user or current user blocked target
    if (targetUser.blockedUsers && targetUser.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot interact with this user.',
      });
    }
    if (req.user.blockedUsers && req.user.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You have blocked this user. Unblock first.',
      });
    }

    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId,
    });

    if (existingFollow) {
      if (existingFollow.status === 'pending') {
        // Cancel pending follow request
        await Follow.findByIdAndDelete(existingFollow._id);
        await Notification.deleteMany({
          user: targetUserId,
          sender: currentUserId,
          type: 'follow_request',
        });

        return res.status(200).json({
          success: true,
          isFollowing: false,
          isPending: false,
          relationship: 'none',
          message: 'Follow request cancelled.',
        });
      } else {
        // Unfollow accepted relationship
        await Follow.findByIdAndDelete(existingFollow._id);
        await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } });
        await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } });

        return res.status(200).json({
          success: true,
          isFollowing: false,
          isPending: false,
          relationship: 'none',
          message: `Unfollowed ${targetUser.fullName}`,
        });
      }
    } else {
      // Check if target account is private
      if (targetUser.isPrivate) {
        await Follow.create({
          follower: currentUserId,
          following: targetUserId,
          status: 'pending',
        });

        const notif = await Notification.create({
          user: targetUserId,
          sender: currentUserId,
          type: 'follow_request',
          actionStatus: 'pending',
          message: `${req.user.fullName} requested to follow you.`,
        });

        if (req.io) {
          req.io.to(`user:${targetUserId}`).emit('new_notification', notif);
          req.io.to(`user:${targetUserId}`).emit('follow_request_received', {
            requester: req.user,
            notification: notif,
          });
        }

        return res.status(200).json({
          success: true,
          status: 'pending',
          isFollowing: false,
          isPending: true,
          relationship: 'requested',
          message: `Follow request sent to ${targetUser.fullName}`,
        });
      } else {
        // Public account - immediately accepted
        await Follow.create({
          follower: currentUserId,
          following: targetUserId,
          status: 'accepted',
        });
        await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });

        const notif = await Notification.create({
          user: targetUserId,
          sender: currentUserId,
          type: 'follow',
          message: `${req.user.fullName} started following you.`,
        });

        if (req.io) {
          req.io.to(`user:${targetUserId}`).emit('new_notification', notif);
          req.io.to(`user:${targetUserId}`).emit('follow_status_changed', {
            follower: req.user,
            isFollowing: true,
          });
        }

        // Check if mutual
        const reverseFollow = await Follow.findOne({
          follower: targetUserId,
          following: currentUserId,
          status: 'accepted',
        });

        const relationship = reverseFollow ? 'mutual' : 'following';

        return res.status(200).json({
          success: true,
          isFollowing: true,
          isPending: false,
          relationship,
          message: `Now following ${targetUser.fullName}`,
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Accept follow request
// @route   POST /api/follow/:id/accept
// @access  Private
const acceptFollowRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const requesterId = req.params.id;

    const follow = await Follow.findOne({
      follower: requesterId,
      following: currentUserId,
      status: 'pending',
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found.',
      });
    }

    follow.status = 'accepted';
    await follow.save();

    await User.findByIdAndUpdate(requesterId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(currentUserId, { $inc: { followersCount: 1 } });

    // Update notification status
    await Notification.updateMany(
      { user: currentUserId, sender: requesterId, type: 'follow_request' },
      { actionStatus: 'accepted' }
    );

    // Notify requester
    const notif = await Notification.create({
      user: requesterId,
      sender: currentUserId,
      type: 'follow_accept',
      message: `${req.user.fullName} accepted your follow request.`,
    });

    if (req.io) {
      req.io.to(`user:${requesterId}`).emit('new_notification', notif);
      req.io.to(`user:${requesterId}`).emit('follow_request_accepted', {
        approver: req.user,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Follow request accepted.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject follow request
// @route   POST /api/follow/:id/reject
// @access  Private
const rejectFollowRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const requesterId = req.params.id;

    const follow = await Follow.findOneAndDelete({
      follower: requesterId,
      following: currentUserId,
      status: 'pending',
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found.',
      });
    }

    await Notification.updateMany(
      { user: currentUserId, sender: requesterId, type: 'follow_request' },
      { actionStatus: 'rejected' }
    );

    res.status(200).json({
      success: true,
      message: 'Follow request rejected.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending follow requests for the authenticated user
// @route   GET /api/follow/requests
// @access  Private
const getPendingFollowRequests = async (req, res, next) => {
  try {
    const requests = await Follow.find({
      following: req.user._id,
      status: 'pending',
    }).populate('follower', 'fullName username profilePicture bio');

    res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests.map((r) => ({
        _id: r._id,
        user: r.follower,
        follower: r.follower,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get relationship state between current user and target user
// @route   GET /api/follow/:id/relationship
// @access  Private
const getRelationshipState = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(200).json({
        success: true,
        relationship: 'self',
        isFollowing: false,
        isPending: false,
        isFollower: false,
        isMutual: false,
        isBlocked: false,
        isPrivate: req.user.isPrivate || false,
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isBlockedByTarget = targetUser.blockedUsers && targetUser.blockedUsers.includes(currentUserId);
    const isBlockedByCurrent = req.user.blockedUsers && req.user.blockedUsers.includes(targetUserId);

    if (isBlockedByTarget || isBlockedByCurrent) {
      return res.status(200).json({
        success: true,
        relationship: 'blocked',
        isFollowing: false,
        isPending: false,
        isFollower: false,
        isMutual: false,
        isBlocked: true,
        isPrivate: targetUser.isPrivate || false,
      });
    }

    const outgoing = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId,
    });

    const incoming = await Follow.findOne({
      follower: targetUserId,
      following: currentUserId,
    });

    const isFollowing = outgoing?.status === 'accepted';
    const isPending = outgoing?.status === 'pending';
    const isFollower = incoming?.status === 'accepted';
    const isMutual = isFollowing && isFollower;

    let relationship = 'none';
    if (isMutual) {
      relationship = 'mutual';
    } else if (isFollowing) {
      relationship = 'following';
    } else if (isPending) {
      relationship = 'requested';
    } else if (isFollower) {
      relationship = 'follower';
    }

    res.status(200).json({
      success: true,
      relationship,
      isFollowing,
      isPending,
      isFollower,
      isMutual,
      isBlocked: false,
      isPrivate: targetUser.isPrivate || false,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get followers
// @route   GET /api/follow/:id/followers
// @access  Private
const getFollowers = async (req, res, next) => {
  try {
    const follows = await Follow.find({ following: req.params.id, status: 'accepted' })
      .populate('follower', 'fullName username profilePicture bio isOnline');

    res.status(200).json({
      success: true,
      count: follows.length,
      followers: follows.map((f) => f.follower),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get following
// @route   GET /api/follow/:id/following
// @access  Private
const getFollowing = async (req, res, next) => {
  try {
    const follows = await Follow.find({ follower: req.params.id, status: 'accepted' })
      .populate('following', 'fullName username profilePicture bio isOnline');

    res.status(200).json({
      success: true,
      count: follows.length,
      following: follows.map((f) => f.following),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check follow status
// @route   GET /api/follow/:id/is-following
// @access  Private
const checkFollowStatus = async (req, res, next) => {
  try {
    const follow = await Follow.findOne({
      follower: req.user._id,
      following: req.params.id,
      status: 'accepted',
    });

    res.status(200).json({
      success: true,
      isFollowing: !!follow,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleFollow,
  acceptFollowRequest,
  rejectFollowRequest,
  getPendingFollowRequests,
  getRelationshipState,
  getFollowers,
  getFollowing,
  checkFollowStatus,
};
