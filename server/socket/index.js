const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Call = require('../models/Call');
const LiveStream = require('../models/LiveStream');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');

const userSockets = new Map(); // userId (string) -> Set of socketIds

const initializeSocket = (io) => {
  // 1. Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_chatflow_2025');
        const user = await User.findById(decoded.id || decoded._id).select('-password');
        if (user) {
          socket.user = user;
          socket.userId = user._id.toString();
        }
      }
      next();
    } catch (err) {
      console.warn('[Socket Auth] Handshake token verification failed:', err.message);
      // Allow connection but without verified session; setupUser can authenticate if token provided
      next();
    }
  });

  io.on('connection', (socket) => {
    let currentUserId = socket.userId || null;

    const registerUserSession = async (userId) => {
      if (!userId) return;
      currentUserId = userId.toString();
      socket.userId = currentUserId;

      if (!userSockets.has(currentUserId)) {
        userSockets.set(currentUserId, new Set());
      }
      userSockets.get(currentUserId).add(socket.id);

      // Join user's individual room for direct notifications and call alerts
      socket.join(`user:${currentUserId}`);

      try {
        const user = await User.findById(currentUserId);
        if (user) {
          await User.findByIdAndUpdate(currentUserId, {
            isOnline: true,
            lastSeen: new Date(),
          });

          // Check privacy settings before broadcasting online status
          const settings = await UserSettings.findOne({ userId: currentUserId });
          const showOnline = settings?.privacy?.onlineStatus !== false;

          if (showOnline) {
            io.emit('userOnline', { userId: currentUserId });
          }
        }
      } catch (e) {
        console.error('[Socket] Error updating user online status:', e.message);
      }

      // Send online users list (filtering out users who hid their status)
      const allOnlineIds = Array.from(userSockets.keys());
      socket.emit('getOnlineUsers', allOnlineIds);
    };

    // Auto-register if authenticated via handshake token
    if (socket.userId) {
      registerUserSession(socket.userId);
    }

    // Client registration event (setupUser)
    socket.on('setupUser', async (data) => {
      const targetUserId = typeof data === 'object' ? data.userId : data;
      if (!targetUserId) return;

      // If socket already authenticated, verify matches or re-register
      if (socket.user && socket.user._id.toString() !== targetUserId.toString()) {
        console.warn(`[Socket Security] Rejecting mismatched setupUser: ${socket.user._id} vs ${targetUserId}`);
        return;
      }
      await registerUserSession(targetUserId);
    });

    // Join conversation room (strictly check participant authorization)
    socket.on('joinConversation', async (conversationId) => {
      try {
        if (!conversationId) return;
        const uid = currentUserId || socket.user?._id;
        if (!uid) return;

        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: { $in: [uid] },
        });

        if (conv) {
          socket.join(`conversation:${conversationId}`);
        } else {
          console.warn(`[Socket Security] Rejecting joinConversation to room conversation:${conversationId} for unauthorized user: ${uid}`);
        }
      } catch (err) {
        console.error('[Socket] joinConversation error:', err.message);
      }
    });

    // Leave conversation room
    socket.on('leaveConversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // --- REAL-TIME MESSAGING EVENTS ---

    // Send message via socket
    const handleSendMessage = async (messageData) => {
      try {
        if (!messageData || !messageData.conversation) return;
        const senderId = currentUserId || socket.user?._id?.toString();
        if (!senderId) return;

        const conversationId =
          typeof messageData.conversation === 'object'
            ? messageData.conversation._id
            : messageData.conversation;

        // Broadcast to conversation room
        socket.to(`conversation:${conversationId}`).emit('receiveMessage', messageData);
        socket.to(`conversation:${conversationId}`).emit('message:new', messageData);

        // Deliver directly to receiver room if direct chat
        if (messageData.receiver) {
          const receiverId =
            typeof messageData.receiver === 'object'
              ? messageData.receiver._id
              : messageData.receiver;

          socket.to(`user:${receiverId}`).emit('receiveMessage', messageData);
          socket.to(`user:${receiverId}`).emit('message:new', messageData);
          socket.to(`user:${receiverId}`).emit('notification', {
            type: 'message',
            message: messageData,
          });
        }
      } catch (err) {
        console.error('[Socket] sendMessage error:', err.message);
      }
    };

    socket.on('sendMessage', handleSendMessage);
    socket.on('message:send', handleSendMessage);

    // Message Delivered Acknowledgment from Recipient
    socket.on('message:delivered', async ({ conversationId, messageIds, senderId }) => {
      try {
        const recipientId = currentUserId || socket.user?._id;
        if (!recipientId || !conversationId) return;

        const deliveredAt = new Date();
        const filter = {
          conversation: conversationId,
          sender: { $ne: recipientId },
          status: 'sent',
        };
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          filter._id = { $in: messageIds };
        }

        await Message.updateMany(filter, {
          $set: { status: 'delivered', deliveredAt },
        });

        // Notify conversation room and sender room
        io.to(`conversation:${conversationId}`).emit('message:delivered', {
          conversationId,
          messageIds,
          deliveredAt,
        });

        if (senderId) {
          io.to(`user:${senderId}`).emit('message:delivered', {
            conversationId,
            messageIds,
            deliveredAt,
          });
        }
      } catch (err) {
        console.error('[Socket] message:delivered error:', err.message);
      }
    });

    // Message Read Receipt
    const handleMessageRead = async ({ conversationId, userId, messageIds }) => {
      try {
        const readerId = currentUserId || userId || socket.user?._id;
        if (!conversationId || !readerId) return;

        const readAt = new Date();
        const filter = {
          conversation: conversationId,
          sender: { $ne: readerId },
        };
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          filter._id = { $in: messageIds };
        }

        await Message.updateMany(filter, {
          $addToSet: { readBy: { user: readerId, readAt } },
          $set: { status: 'read', readAt },
        });

        io.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          userId: readerId,
          messageIds,
          readAt,
        });
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId: readerId,
          messageIds,
          readAt,
        });
      } catch (err) {
        console.error('[Socket] messageRead error:', err.message);
      }
    };

    socket.on('messageRead', handleMessageRead);
    socket.on('message:read', handleMessageRead);

    // Typing Indicators (debounced by client)
    const handleTypingStart = ({ conversationId, userId, username }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        conversationId,
        userId: currentUserId || userId,
        username,
      });
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: currentUserId || userId,
        username,
      });
    };

    const handleTypingStop = ({ conversationId, userId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userStoppedTyping', {
        conversationId,
        userId: currentUserId || userId,
      });
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: currentUserId || userId,
      });
    };

    socket.on('typing', handleTypingStart);
    socket.on('typing:start', handleTypingStart);
    socket.on('stopTyping', handleTypingStop);
    socket.on('typing:stop', handleTypingStop);

    // Reactions, edits, deletes
    socket.on('messageReaction', ({ conversationId, messageId, reactions }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('messageReaction', {
        conversationId,
        messageId,
        reactions,
      });
      socket.to(`conversation:${conversationId}`).emit('message:reaction', {
        conversationId,
        messageId,
        reactions,
      });
    });

    socket.on('messageEdited', (updatedMessage) => {
      if (!updatedMessage || !updatedMessage.conversation) return;
      const conversationId =
        typeof updatedMessage.conversation === 'object'
          ? updatedMessage.conversation._id
          : updatedMessage.conversation;
      socket.to(`conversation:${conversationId}`).emit('messageEdited', updatedMessage);
      socket.to(`conversation:${conversationId}`).emit('message:edited', updatedMessage);
    });

    socket.on('messageDeleted', ({ conversationId, messageId, deleteType }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('messageDeleted', {
        conversationId,
        messageId,
        deleteType,
      });
      socket.to(`conversation:${conversationId}`).emit('message:deleted', {
        conversationId,
        messageId,
        deleteType,
      });
    });

    // Shared Conversation Theme Socket Event
    const handleUpdateTheme = async ({ conversationId, theme }) => {
      try {
        const uid = currentUserId || socket.user?._id;
        if (!uid || !conversationId || !theme) return;
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: { $in: [uid] },
        });
        if (!conv) return;

        const VALID_THEMES = [
          'default',
          'blue',
          'purple',
          'green',
          'midnight',
          'ocean',
          'sunset',
          'lavender',
          'rose',
          'forest',
          'sky',
          'minimal',
          'neon',
          'coffee',
          'aurora',
        ];
        const selectedTheme = theme.toString().toLowerCase().trim();
        if (!VALID_THEMES.includes(selectedTheme)) return;

        conv.theme = selectedTheme;
        await conv.save();

        io.to(`conversation:${conversationId}`).emit('chat:themeUpdated', {
          conversationId: conv._id.toString(),
          theme: conv.theme,
        });

        conv.participants.forEach((p) => {
          const pId = (p._id || p).toString();
          io.to(`user:${pId}`).emit('conversation:themeUpdated', {
            conversationId: conv._id.toString(),
            theme: conv.theme,
          });
        });
      } catch (err) {
        console.error('[Socket] updateTheme error:', err.message);
      }
    };

    socket.on('updateTheme', handleUpdateTheme);
    socket.on('chat:updateTheme', handleUpdateTheme);

    socket.on('post:delete', ({ postId }) => {
      io.emit('post:deleted', { postId });
    });

    socket.on('reel:delete', ({ reelId }) => {
      io.emit('reel:deleted', { reelId });
    });

    socket.on('story:delete', ({ storyId, authorId }) => {
      io.emit('story:deleted', { storyId, authorId });
    });

    // --- REAL-TIME WEBRTC CALLING EVENTS (VOICE & VIDEO) ---

    // Caller requests call
    socket.on('call:request', async ({ receiverId, type = 'audio', callerInfo }) => {
      try {
        const callerId = currentUserId || socket.user?._id?.toString();
        if (!callerId || !receiverId) {
          return socket.emit('call:error', { message: 'Authentication or receiver missing' });
        }

        if (callerId === receiverId) {
          return socket.emit('call:error', { message: 'Cannot call yourself' });
        }

        const caller = await User.findById(callerId);
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit('call:error', { message: 'User not found' });
        }

        // 1. Check blocking
        if (caller.blockedUsers && caller.blockedUsers.includes(receiverId)) {
          return socket.emit('call:error', {
            code: 'USER_BLOCKED',
            message: 'You have blocked this user. Unblock to call.',
          });
        }
        if (receiver.blockedUsers && receiver.blockedUsers.includes(callerId)) {
          return socket.emit('call:error', {
            code: 'BLOCKED_BY_USER',
            message: 'You cannot call this user because you are blocked.',
          });
        }

        // 2. Check Permissions from receiver's UserSettings
        const receiverSettings = await UserSettings.findOne({ userId: receiverId });
        if (receiverSettings?.messages) {
          const { whoCanCall, voiceCallsEnabled, videoCallsEnabled } = receiverSettings.messages;

          if (type === 'audio' && voiceCallsEnabled === false) {
            return socket.emit('call:error', {
              code: 'CALLS_DISABLED',
              message: 'This user has disabled voice calls.',
            });
          }
          if (type === 'video' && videoCallsEnabled === false) {
            return socket.emit('call:error', {
              code: 'CALLS_DISABLED',
              message: 'This user has disabled video calls.',
            });
          }
          if (whoCanCall === 'nobody') {
            return socket.emit('call:error', {
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
              return socket.emit('call:error', {
                code: 'PERMISSION_DENIED',
                message: 'Only connections can call this user.',
              });
            }
          }
        }

        // 3. Check if receiver is online
        const isReceiverOnline = userSockets.has(receiverId) && userSockets.get(receiverId).size > 0;

        // Create call record in DB
        const callRecord = await Call.create({
          caller: callerId,
          receiver: receiverId,
          type,
          status: isReceiverOnline ? 'calling' : 'missed',
          startedAt: new Date(),
        });

        if (!isReceiverOnline) {
          socket.emit('call:offline', {
            callId: callRecord._id,
            receiverId,
            message: 'User is currently offline.',
          });
          return;
        }

        const callerPayload = {
          _id: caller._id,
          fullName: caller.fullName,
          username: caller.username,
          profilePicture: caller.profilePicture,
          ...callerInfo,
        };

        // Notify caller that call request was created
        socket.emit('call:initiated', {
          callId: callRecord._id,
          receiverId,
          type,
        });

        // Emit incoming call to receiver's private room
        io.to(`user:${receiverId}`).emit('call:incoming', {
          callId: callRecord._id,
          caller: callerPayload,
          type,
        });
      } catch (err) {
        console.error('[Socket] call:request error:', err.message);
        socket.emit('call:error', { message: err.message });
      }
    });

    // Receiver acknowledges ringing
    socket.on('call:ringing', async ({ callId, callerId }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, { status: 'ringing' });
        }
        if (callerId) {
          io.to(`user:${callerId}`).emit('call:ringing', { callId });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Receiver accepts call
    socket.on('call:accept', async ({ callId, callerId }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: 'completed',
            answeredAt: new Date(),
          });
        }
        if (callerId) {
          io.to(`user:${callerId}`).emit('call:accepted', {
            callId,
            receiverId: currentUserId,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Receiver declines call
    socket.on('call:decline', async ({ callId, callerId, reason = 'declined' }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: 'declined',
            endedAt: new Date(),
            endedReason: reason,
          });
        }
        if (callerId) {
          io.to(`user:${callerId}`).emit('call:declined', {
            callId,
            receiverId: currentUserId,
            reason,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Caller cancels call before answer
    socket.on('call:cancel', async ({ callId, receiverId }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: 'cancelled',
            endedAt: new Date(),
            endedReason: 'caller_cancelled',
          });
        }
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('call:cancelled', {
            callId,
            callerId: currentUserId,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Active call ended by either party
    socket.on('call:end', async ({ callId, targetUserId, duration = 0 }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: 'completed',
            endedAt: new Date(),
            duration: parseInt(duration) || 0,
            endedReason: 'hangup',
          });
        }
        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit('call:ended', {
            callId,
            endedBy: currentUserId,
            duration,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // WebRTC Signaling: SDP Offer
    socket.on('call:offer', ({ callId, targetUserId, offer }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:offer', {
          callId,
          offer,
          fromUserId: currentUserId,
        });
      }
    });

    // WebRTC Signaling: SDP Answer
    socket.on('call:answer', ({ callId, targetUserId, answer }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:answer', {
          callId,
          answer,
          fromUserId: currentUserId,
        });
      }
    });

    // WebRTC Signaling: ICE Candidate Exchange
    socket.on('call:ice-candidate', ({ callId, targetUserId, candidate }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
          callId,
          candidate,
          fromUserId: currentUserId,
        });
      }
    });

    // Call Reconnecting state notification
    socket.on('call:reconnecting', ({ targetUserId }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:reconnecting', {
          fromUserId: currentUserId,
        });
      }
    });

    // --- REAL-TIME LIVE STREAMING EVENTS ---
    socket.on('joinLiveRoom', ({ streamId, user }) => {
      if (!streamId) return;
      socket.join(`live:${streamId}`);
      socket.to(`live:${streamId}`).emit('liveViewerJoined', {
        streamId,
        user: user || socket.user,
        socketId: socket.id,
      });
      socket.to(`live:${streamId}`).emit('live:viewer-joined', {
        streamId,
        user: user || socket.user,
        socketId: socket.id,
      });
    });

    socket.on('leaveLiveRoom', ({ streamId, user }) => {
      if (!streamId) return;
      socket.leave(`live:${streamId}`);
      socket.to(`live:${streamId}`).emit('liveViewerLeft', {
        streamId,
        user: user || socket.user,
        socketId: socket.id,
      });
      socket.to(`live:${streamId}`).emit('live:viewer-left', {
        streamId,
        user: user || socket.user,
        socketId: socket.id,
      });
    });

    // WebRTC Signaling for Live Broadcast (Host to Viewer)
    socket.on('liveOffer', ({ streamId, offer, toViewerSocketId }) => {
      if (toViewerSocketId) {
        io.to(toViewerSocketId).emit('liveOffer', {
          streamId,
          offer,
          hostSocketId: socket.id,
        });
      }
    });

    socket.on('liveAnswer', ({ streamId, answer, toHostSocketId }) => {
      if (toHostSocketId) {
        io.to(toHostSocketId).emit('liveAnswer', {
          streamId,
          answer,
          viewerSocketId: socket.id,
        });
      }
    });

    socket.on('liveIceCandidate', ({ candidate, targetSocketId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('liveIceCandidate', {
          candidate,
          fromSocketId: socket.id,
        });
      }
    });

    // Live Guest WebRTC Signaling (Creator invites Viewer to co-host)
    socket.on('live:guest-invite', ({ streamId, targetUserId }) => {
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('live:guest-invite', {
          streamId,
          hostId: currentUserId,
        });
      }
    });

    socket.on('live:guest-accept', ({ streamId, hostId }) => {
      if (hostId) {
        io.to(`user:${hostId}`).emit('live:guest-accepted', {
          streamId,
          guestId: currentUserId,
          guestSocketId: socket.id,
        });
      }
    });

    socket.on('live:guest-remove', ({ streamId, guestUserId }) => {
      if (guestUserId) {
        io.to(`user:${guestUserId}`).emit('live:guest-removed', { streamId });
      }
      io.to(`live:${streamId}`).emit('live:guest-removed', { streamId, guestUserId });
    });

    // Real-time Live Comments & Floating Reaction Bursts
    socket.on('liveComment', ({ streamId, comment }) => {
      if (!streamId) return;
      io.to(`live:${streamId}`).emit('liveComment', comment);
      io.to(`live:${streamId}`).emit('live:comment', comment);
    });

    socket.on('liveReaction', ({ streamId, emoji, user }) => {
      if (!streamId) return;
      const reactionPayload = {
        emoji: emoji || '❤️',
        user: user || socket.user,
        id: Date.now() + Math.random(),
      };
      io.to(`live:${streamId}`).emit('liveReaction', reactionPayload);
      io.to(`live:${streamId}`).emit('live:reaction', reactionPayload);
    });

    // Live Moderation (delete comment, timeout user, slow mode, end live)
    socket.on('live:moderation', ({ streamId, action, targetUserId, commentId }) => {
      if (!streamId) return;
      io.to(`live:${streamId}`).emit('live:moderation', {
        action,
        targetUserId,
        commentId,
      });
    });

    socket.on('liveEnded', ({ streamId }) => {
      if (!streamId) return;
      io.to(`live:${streamId}`).emit('liveEnded', { streamId });
      io.to(`live:${streamId}`).emit('live:ended', { streamId });
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      if (currentUserId && userSockets.has(currentUserId)) {
        const sockets = userSockets.get(currentUserId);
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          userSockets.delete(currentUserId);
          try {
            await User.findByIdAndUpdate(currentUserId, {
              isOnline: false,
              lastSeen: new Date(),
            });

            // Check privacy setting before broadcasting offline status
            const settings = await UserSettings.findOne({ userId: currentUserId });
            const showOnline = settings?.privacy?.onlineStatus !== false;

            if (showOnline) {
              io.emit('userOffline', { userId: currentUserId, lastSeen: new Date() });
            }
          } catch (e) {
            console.error('[Socket] Error updating user offline status:', e.message);
          }
        }
      }
    });
  });
};

module.exports = { initializeSocket };
