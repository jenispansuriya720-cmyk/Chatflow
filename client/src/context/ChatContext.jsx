import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { [convId]: [usernames] }
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const messagesCacheRef = useRef(new Map());
  const activeConvRef = useRef(activeConversation);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Synchronize in-memory cache whenever active conversation messages change
  const setCachedMessages = useCallback((updater) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (activeConvRef.current?._id) {
        messagesCacheRef.current.set(activeConvRef.current._id, next);
      }
      return next;
    });
  }, []);

  // Fetch all conversations (avoid unnecessary loading indicator on background refreshes)
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setConversations((current) => {
        if (current.length === 0) setLoadingConversations(true);
        return current;
      });
      const res = await api.get('/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Sync undelivered messages on connection
  useEffect(() => {
    if (user && socket) {
      api.post('/messages/sync-undelivered').catch(() => {});
    }
  }, [user?._id, socket]);

  // Select a conversation and load its messages (instantly renders from memory cache if available)
  const selectConversation = useCallback(
    async (convOrId) => {
      const convId = typeof convOrId === 'object' && convOrId ? convOrId._id : convOrId;
      if (!convId) {
        setActiveConversation(null);
        setMessages([]);
        return;
      }

      // 1. Instant Cache Render: If conversation messages exist in memory, display immediately
      const cached = messagesCacheRef.current.get(convId);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLoadingMessages(false);
      } else {
        setLoadingMessages(true);
      }

      try {
        // Join socket room
        if (socket) {
          socket.emit('joinConversation', convId);
        }

        // Fetch conversation details if needed
        let conv = conversations.find((c) => c._id === convId);
        if (!conv) {
          const cRes = await api.get(`/conversations/${convId}`);
          if (cRes.data.success) {
            conv = cRes.data.conversation;
          }
        }
        setActiveConversation(conv || null);
        setReplyingTo(null);

        // Fetch newest 30 messages asynchronously
        const res = await api.get(`/messages/${convId}?limit=30`);
        if (res.data.success) {
          setMessages(res.data.messages);
          messagesCacheRef.current.set(convId, res.data.messages);
          setHasMoreMessages(Boolean(res.data.hasMore));

          // Zero out unread count in conversations state
          setConversations((prev) =>
            prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setLoadingMessages(false);
      }
    },
    [conversations, socket]
  );

  // Load older messages via cursor pagination when user scrolls to top
  const loadOlderMessages = useCallback(async () => {
    const currentConv = activeConvRef.current;
    if (!currentConv?._id || loadingOlderMessages || !hasMoreMessages) return;

    const currentCached = messagesCacheRef.current.get(currentConv._id) || [];
    if (currentCached.length === 0) return;

    const oldestMessage = currentCached[0];
    if (!oldestMessage?.createdAt) return;

    try {
      setLoadingOlderMessages(true);
      const res = await api.get(`/messages/${currentConv._id}`, {
        params: { before: oldestMessage.createdAt, limit: 30 },
      });

      if (res.data.success && res.data.messages?.length > 0) {
        const older = res.data.messages;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueOlder = older.filter((m) => !existingIds.has(m._id));
          const combined = [...uniqueOlder, ...prev];
          messagesCacheRef.current.set(currentConv._id, combined);
          return combined;
        });
        setHasMoreMessages(Boolean(res.data.hasMore));
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [loadingOlderMessages, hasMoreMessages]);

  // Send a message with instant optimistic update, background media upload, and retry on failure
  const sendMessage = async ({
    text,
    attachments = [],
    pendingFiles = [],
    voiceData = null,
    type = 'text',
    sharedContent = null,
    pollData = null,
    eventData = null,
    imageUrl = '',
  }) => {
    if (!activeConversation) return;

    const convId = activeConversation._id;
    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Other participant in direct chat
    const otherParticipant = activeConversation.type === 'direct'
      ? activeConversation.participants?.find((p) => (p._id || p) !== user?._id)
      : null;

    // Generate local preview attachments for any pending files
    let previewAttachments = [...(attachments || [])];
    let resolvedImg = imageUrl || '';

    if (pendingFiles && pendingFiles.length > 0) {
      const generatedPreviews = pendingFiles.map((p) => {
        const fileObj = p.file || p;
        const isImage = p.isImage || p.mimeType?.startsWith('image/') || fileObj.type?.startsWith('image/');
        const isVideo = p.mimeType?.startsWith('video/') || fileObj.type?.startsWith('video/');
        const previewUrl = p.previewUrl || (fileObj instanceof Blob ? URL.createObjectURL(fileObj) : '');
        return {
          fileType: isImage ? 'image' : isVideo ? 'video' : 'document',
          url: previewUrl,
          name: p.name || fileObj.name || 'Attachment',
          size: p.size || fileObj.size || 0,
          mimeType: p.mimeType || fileObj.type || '',
          isLocalPreview: true,
        };
      });
      previewAttachments = [...previewAttachments, ...generatedPreviews];
      if (!resolvedImg) {
        const firstImg = previewAttachments.find((a) => a.fileType === 'image');
        if (firstImg) resolvedImg = firstImg.url;
      }
    } else if (!resolvedImg && attachments?.length > 0) {
      const firstImg = attachments.find((a) => a.fileType === 'image');
      if (firstImg) resolvedImg = firstImg.url;
    }

    const resolvedType = resolvedImg ? 'image' : previewAttachments.length > 0 ? 'media' : type;

    const previousReply = replyingTo;
    setReplyingTo(null);

    // Reusable background execution function
    const executeBackgroundSend = async () => {
      try {
        let uploadedAttachments = [...(attachments || [])];
        let primaryImageUrl = imageUrl || '';

        // If there are pending files, upload them in background to real storage
        if (pendingFiles && pendingFiles.length > 0) {
          for (let i = 0; i < pendingFiles.length; i++) {
            const item = pendingFiles[i];
            const fileObj = item.file || item;
            const formData = new FormData();
            formData.append('file', fileObj);
            formData.append('entityType', 'chat');

            const isImage = item.isImage || item.mimeType?.startsWith('image/') || fileObj.type?.startsWith('image/');
            const uploadEndpoint = isImage ? '/upload/chat-image' : '/upload';

            const res = await api.post(uploadEndpoint, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (!res.data.success || !res.data.file?.url) {
              throw new Error('Image upload failed. Could not verify storage URL.');
            }

            const uploaded = res.data.file;
            uploadedAttachments.push({
              fileType: uploaded.fileType || (isImage ? 'image' : 'document'),
              url: uploaded.url,
              publicId: uploaded.publicId || '',
              name: uploaded.name || item.name || fileObj.name,
              size: uploaded.size || item.size || fileObj.size,
              mimeType: uploaded.mimeType || item.mimeType || fileObj.type,
            });

            if (isImage && !primaryImageUrl) {
              primaryImageUrl = uploaded.url;
            }
          }
        }

        // Cleanup local preview URLs
        if (pendingFiles && pendingFiles.length > 0) {
          pendingFiles.forEach((p) => {
            if (p.previewUrl && p.previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(p.previewUrl);
            }
          });
        }

        const hasImage = uploadedAttachments.some((a) => a.fileType === 'image') || Boolean(primaryImageUrl);
        const finalMessageType = hasImage ? 'image' : uploadedAttachments.length > 0 ? 'media' : type;

        const payload = {
          conversationId: convId,
          text: text || '',
          type: finalMessageType,
          imageUrl: primaryImageUrl,
          sharedContent,
          pollData,
          eventData,
          attachments: uploadedAttachments,
          voiceData,
          replyTo: previousReply ? (previousReply._id || previousReply) : undefined,
          replyToMessageId: previousReply ? (previousReply._id || previousReply) : undefined,
          clientMessageId,
        };

        const res = await api.post('/messages', payload);
        if (res.data.success) {
          const sentMsg = res.data.message;

          // Replace temporary message with persistent message
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId || (m.clientMessageId && m.clientMessageId === clientMessageId)
                ? sentMsg
                : m
            )
          );

          // Emit to recipient via Socket.IO
          if (socket) {
            socket.emit('sendMessage', sentMsg);
          }

          // Update lastMessage in conversation list
          setConversations((prev) =>
            prev.map((c) => {
              if (c._id === convId) {
                return {
                  ...c,
                  lastMessage: sentMsg,
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            })
          );

          return sentMsg;
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        // Mark message as failed with retry callback
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId || (m.clientMessageId && m.clientMessageId === clientMessageId)
              ? {
                  ...m,
                  status: 'failed',
                  onRetry: () => {
                    setMessages((current) =>
                      current.map((item) =>
                        item._id === tempId || (item.clientMessageId && item.clientMessageId === clientMessageId)
                          ? { ...item, status: 'sending' }
                          : item
                      )
                    );
                    executeBackgroundSend();
                  },
                }
              : m
          )
        );
      }
    };

    // Optimistic message added to chat immediately
    const optimisticMsg = {
      _id: tempId,
      clientMessageId,
      conversation: convId,
      sender: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        profilePicture: user.profilePicture,
      },
      receiver: otherParticipant?._id || otherParticipant,
      text: text || '',
      type: resolvedType,
      imageUrl: resolvedImg,
      sharedContent,
      pollData,
      eventData,
      attachments: previewAttachments,
      voiceData: voiceData || { duration: 0, waveform: [] },
      replyTo: previousReply || null,
      status: 'sending',
      createdAt: new Date().toISOString(),
      onRetry: () => executeBackgroundSend(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Fire background task (non-blocking for UI)
    executeBackgroundSend();
    return optimisticMsg;
  };

  // Socket event listeners for real-time synchronization
  useEffect(() => {
    if (!socket) return;

    // Incoming message
    const handleReceiveMessage = (newMsg) => {
      const convId =
        typeof newMsg.conversation === 'object'
          ? newMsg.conversation._id
          : newMsg.conversation;

      const senderId =
        typeof newMsg.sender === 'object' ? newMsg.sender._id : newMsg.sender;

      // Check if it's currently open conversation
      if (activeConvRef.current && activeConvRef.current._id === convId) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m._id === newMsg._id ||
                (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId)
            )
          ) {
            return prev;
          }
          return [...prev, newMsg];
        });

        // Mark as read immediately since conversation is open
        api.put(`/messages/read/${convId}`).catch(() => {});
        socket.emit('messageRead', {
          conversationId: convId,
          userId: user?._id,
          messageIds: [newMsg._id],
        });

        // Also acknowledge delivery
        socket.emit('message:delivered', {
          conversationId: convId,
          messageIds: [newMsg._id],
          senderId,
        });
      } else {
        // Conversation not open: increment unread count & acknowledge delivery
        setConversations((prev) =>
          prev.map((c) => {
            if (c._id === convId) {
              return {
                ...c,
                unreadCount: (c.unreadCount || 0) + 1,
                lastMessage: newMsg,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          })
        );

        // Acknowledge delivered status to server & sender
        socket.emit('message:delivered', {
          conversationId: convId,
          messageIds: [newMsg._id],
          senderId,
        });
        api.put(`/messages/delivered/${convId}`, { messageIds: [newMsg._id] }).catch(() => {});
      }
    };

    // Message Delivered status update
    const handleMessageDelivered = ({ conversationId, messageIds, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (
            (Array.isArray(messageIds) && messageIds.includes(m._id)) ||
            (m.conversation === conversationId && m.status === 'sent')
          ) {
            return { ...m, status: 'delivered', deliveredAt: deliveredAt || new Date() };
          }
          return m;
        })
      );

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && c.lastMessage && c.lastMessage.status === 'sent') {
            return {
              ...c,
              lastMessage: { ...c.lastMessage, status: 'delivered' },
            };
          }
          return c;
        })
      );
    };

    // Message Read status update
    const handleMessageRead = ({ conversationId, messageIds, readAt }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (
            (Array.isArray(messageIds) && messageIds.includes(m._id)) ||
            m.conversation === conversationId
          ) {
            return { ...m, status: 'read', readAt: readAt || new Date() };
          }
          return m;
        })
      );

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && c.lastMessage) {
            return {
              ...c,
              lastMessage: { ...c.lastMessage, status: 'read' },
            };
          }
          return c;
        })
      );
    };

    // Typing indicators
    const handleUserTyping = ({ conversationId, username }) => {
      setTypingUsers((prev) => {
        const current = prev[conversationId] || [];
        if (!current.includes(username)) {
          return { ...prev, [conversationId]: [...current, username] };
        }
        return prev;
      });
    };

    const handleUserStoppedTyping = ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const current = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: current.filter((u) => u !== userId),
        };
      });
    };

    // Message reactions
    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    // Message edited
    const handleMessageEdited = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId, deleteType }) => {
      const isEveryone = deleteType === 'for_everyone' || deleteType === 'everyone';
      if (isEveryone) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  text: 'This message was deleted',
                  isDeleted: true,
                  attachments: [],
                  voiceData: { duration: 0, waveform: [] },
                  sharedContent: null,
                  pollData: null,
                  eventData: null,
                }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    const handleChatThemeUpdated = ({ conversationId: cId, theme: newTheme }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === cId ? { ...c, theme: newTheme } : c))
      );
      if (activeConvRef.current && activeConvRef.current._id === cId) {
        setActiveConversation((prev) => (prev ? { ...prev, theme: newTheme } : prev));
      }
    };

    const handleConversationCreated = (newConv) => {
      if (!newConv || !newConv._id) return;
      setConversations((prev) => {
        if (prev.some((c) => c._id === newConv._id)) return prev;
        return [newConv, ...prev];
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('message:new', handleReceiveMessage);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('messageRead', handleMessageRead);
    socket.on('userTyping', handleUserTyping);
    socket.on('typing:start', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('typing:stop', handleUserStoppedTyping);
    socket.on('messageReaction', handleMessageReaction);
    socket.on('message:reaction', handleMessageReaction);
    socket.on('message:reactionUpdated', handleMessageReaction);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('message:edited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('chat:themeUpdated', handleChatThemeUpdated);
    socket.on('conversationCreated', handleConversationCreated);
    socket.on('conversation:created', handleConversationCreated);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('message:new', handleReceiveMessage);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('messageRead', handleMessageRead);
      socket.off('userTyping', handleUserTyping);
      socket.off('typing:start', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('typing:stop', handleUserStoppedTyping);
      socket.off('messageReaction', handleMessageReaction);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('message:reactionUpdated', handleMessageReaction);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('message:edited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('chat:themeUpdated', handleChatThemeUpdated);
      socket.off('conversationCreated', handleConversationCreated);
      socket.off('conversation:created', handleConversationCreated);
    };
  }, [socket, user?._id]);

  // Send typing event with debounce
  const typingTimerRef = useRef(null);
  const sendTypingStatus = (isTyping) => {
    if (!socket || !activeConversation || !user) return;

    if (isTyping) {
      socket.emit('typing', {
        conversationId: activeConversation._id,
        userId: user._id,
        username: user.fullName || user.username,
      });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('stopTyping', {
          conversationId: activeConversation._id,
          userId: user._id,
        });
      }, 2000);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.emit('stopTyping', {
        conversationId: activeConversation._id,
        userId: user._id,
      });
    }
  };

  // Add / toggle reaction with optimistic feedback (Requirements 6, 7, 8, 10, 16, 19)
  const reactToMessage = async (messageId, emoji, action = 'toggle') => {
    if (!user?._id) return;
    const currentUid = user._id.toString();

    // Optimistic UI update for immediate responsiveness
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        const currentReactions = m.reactions || [];
        const existingIdx = currentReactions.findIndex(
          (r) =>
            ((r.user?._id || r.user || r.userId)?.toString() === currentUid) &&
            r.emoji === emoji
        );

        let nextReactions = [...currentReactions];
        if (existingIdx > -1) {
          if (action === 'ensure' || action === 'like') {
            return m; // Keep existing reaction on double-tap
          } else {
            nextReactions.splice(existingIdx, 1); // Remove reaction
          }
        } else {
          // Replace any other reaction from this user (at most 1 reaction per user)
          nextReactions = nextReactions.filter(
            (r) => (r.user?._id || r.user || r.userId)?.toString() !== currentUid
          );
          nextReactions.push({
            emoji,
            user: {
              _id: user._id,
              fullName: user.fullName,
              username: user.username,
              profilePicture: user.profilePicture,
            },
            createdAt: new Date().toISOString(),
          });
        }
        return { ...m, reactions: nextReactions };
      })
    );

    try {
      const res = await api.post(`/messages/${messageId}/react`, { emoji, action });
      if (res.data.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? res.data.message : m))
        );
        if (socket && activeConversation) {
          const payload = {
            conversationId: activeConversation._id,
            messageId,
            reactions: res.data.reactions,
          };
          socket.emit('messageReaction', payload);
          socket.emit('message:reaction', payload);
          socket.emit('message:reactionUpdated', payload);
        }
      }
    } catch (err) {
      console.error('Failed to react to message:', err);
      // Fetch latest message to rollback clean state
      if (activeConversation?._id) {
        api.get(`/messages/${activeConversation._id}`).then((res) => {
          if (res.data.messages) setMessages(res.data.messages);
        }).catch(() => {});
      }
    }
  };

  // Edit message
  const editMessage = async (messageId, text) => {
    try {
      const res = await api.put(`/messages/${messageId}`, { text });
      if (res.data.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? res.data.message : m))
        );
        if (socket && activeConversation) {
          socket.emit('messageEdited', res.data.message);
        }
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      throw err;
    }
  };

  // Delete message
  const deleteMessage = async (messageId, deleteType = 'for_everyone') => {
    try {
      const res = await api.delete(`/messages/${messageId}`, {
        data: { deleteType },
        params: { deleteType },
      });
      if (res.data.success) {
        const isEveryone = deleteType === 'for_everyone' || deleteType === 'everyone';
        if (isEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    text: 'This message was deleted',
                    isDeleted: true,
                    attachments: [],
                    voiceData: { duration: 0, waveform: [] },
                    sharedContent: null,
                    pollData: null,
                    eventData: null,
                  }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }

        if (socket && activeConversation) {
          socket.emit('messageDeleted', {
            conversationId: activeConversation._id,
            messageId,
            deleteType,
          });
          socket.emit('message:deleted', {
            conversationId: activeConversation._id,
            messageId,
            deleteType,
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw err;
    }
  };

  // Pin / Unpin conversation
  const togglePinChat = async (convId) => {
    try {
      const res = await api.put(`/conversations/${convId}/pin`);
      if (res.data.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isPinned: res.data.isPinned } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Mute / Unmute conversation
  const toggleMuteChat = async (convId) => {
    try {
      const res = await api.put(`/conversations/${convId}/mute`);
      if (res.data.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isMuted: res.data.isMuted } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  // Start direct chat helper (instant state update without heavy refetch)
  const startDirectChat = async (userId) => {
    try {
      const res = await api.post(`/conversations/direct/${userId}`);
      if (res.data.success) {
        const conv = res.data.conversation;
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
        await selectConversation(conv._id);
        return conv;
      }
    } catch (err) {
      console.error('Failed to start direct chat:', err);
      throw err;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        hasMoreMessages,
        loadingOlderMessages,
        loadOlderMessages,
        typingUsers,
        replyingTo,
        setReplyingTo,
        searchFilter,
        setSearchFilter,
        fetchConversations,
        selectConversation,
        sendMessage,
        reactToMessage,
        editMessage,
        deleteMessage,
        sendTypingStatus,
        togglePinChat,
        toggleMuteChat,
        startDirectChat,
        openDirectChat: startDirectChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
