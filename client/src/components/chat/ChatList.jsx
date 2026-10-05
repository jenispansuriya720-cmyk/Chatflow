import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  UserPlus,
  MessageSquareDashed,
  X,
  Camera,
  Check,
  UserCheck,
  UserX,
  Inbox,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../common/Toast';
import ChatItem from './ChatItem';
import { ChatSkeleton } from '../common/LoadingSpinner';
import PeopleSuggestions from './PeopleSuggestions';
import Avatar from '../common/Avatar';
import StoryViewerModal from '../social/StoryViewerModal';
import CreateStoryModal from '../social/CreateStoryModal';
import api from '../../services/api';

const ChatList = ({ onSelectChat }) => {
  const { conversations, activeConversation, selectConversation, loadingConversations } = useChat();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Navigation / section tabs
  const [mainTab, setMainTab] = useState('messages'); // 'messages' | 'requests'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'groups' | 'direct'
  const [searchTerm, setSearchTerm] = useState('');

  // Stories state
  const [storyGroups, setStoryGroups] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false);

  // Requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const myUserId = user?._id?.toString() || user?.id?.toString();

  // Load real stories from API
  const fetchStories = async () => {
    try {
      setLoadingStories(true);
      const res = await api.get('/stories');
      if (res.data?.success) {
        setStoryGroups(res.data.storyGroups || []);
      }
    } catch (err) {
      // Silently handle error
    } finally {
      setLoadingStories(false);
    }
  };

  // Load real pending connection/message requests from API
  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/connections/requests');
      if (res.data?.success) {
        setPendingRequests(res.data.requests || []);
      }
    } catch (err) {
      // Silently handle error
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchStories();
    fetchPendingRequests();

    const handleCustomStoryCreated = () => fetchStories();
    window.addEventListener('chatflow:story-created', handleCustomStoryCreated);

    return () => {
      window.removeEventListener('chatflow:story-created', handleCustomStoryCreated);
    };
  }, []);

  // Real-time socket sync for connection requests
  useEffect(() => {
    if (!socket) return;

    const handleConnectionChanged = () => {
      fetchPendingRequests();
    };

    const handleNewNotification = (notif) => {
      if (notif.type === 'connection_request' || notif.type === 'connection_accept') {
        fetchPendingRequests();
      }
    };

    socket.on('connection_status_changed', handleConnectionChanged);
    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('connection_status_changed', handleConnectionChanged);
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  // Request actions
  const handleAcceptRequest = async (requestId, requesterId) => {
    try {
      setActionLoadingId(requestId);
      const res = await api.post(`/connections/accept/${requesterId}`);
      if (res.data?.success) {
        addToast?.('success', 'Request accepted! You can now message each other.');
        setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      addToast?.('error', err.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId, requesterId) => {
    try {
      setActionLoadingId(requestId);
      const res = await api.post(`/connections/reject/${requesterId}`);
      if (res.data?.success) {
        addToast?.('info', 'Request declined.');
        setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      addToast?.('error', err.response?.data?.message || 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Find user's own story group
  const myStoryGroup = storyGroups.find((g) => {
    const groupUserId = g.user?._id?.toString() || g.user?.toString();
    return groupUserId && groupUserId === myUserId;
  });
  const hasMyStories = Boolean(myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length > 0);

  // Other followed stories
  const otherStoryGroups = storyGroups.filter((g) => {
    const groupUserId = g.user?._id?.toString() || g.user?.toString();
    return !groupUserId || groupUserId !== myUserId;
  });

  // Total unread count
  const totalUnread = (conversations || []).reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Tab filter
      if (filterTab === 'unread' && (!conv.unreadCount || conv.unreadCount === 0)) {
        return false;
      }
      if (filterTab === 'groups' && conv.type !== 'group') {
        return false;
      }
      if (filterTab === 'direct' && conv.type !== 'direct') {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const isGroup = conv.type === 'group';
        const otherParticipant = !isGroup
          ? conv.participants?.find((p) => p._id !== user?._id)
          : null;

        const name = isGroup
          ? conv.groupName
          : otherParticipant?.fullName || otherParticipant?.username || '';

        const lastMsgText = conv.lastMessage?.text || '';

        return (
          name.toLowerCase().includes(query) ||
          lastMsgText.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [conversations, filterTab, searchTerm, user?._id]);

  const handleChatClick = (conv) => {
    selectConversation(conv._id);
    if (onSelectChat) onSelectChat(conv);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'direct', label: 'Direct' },
    { id: 'groups', label: 'Groups' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-surface/70 border-r-0 lg:border-r border-slate-200 dark:border-dark-border select-none min-w-0">
      {/* Top Header Section */}
      <div className="p-3 sm:p-4 pb-2 border-b border-slate-200 dark:border-dark-border flex-shrink-0">
        {/* Desktop Header Row (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chats
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400">
              {conversations.length}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigate('/groups/create')}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
              title="Create New Group"
              aria-label="Create New Group"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
              title="Start New Chat"
              aria-label="Start New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tablet Header Row (768px - 1023px) */}
        <div className="hidden md:flex lg:hidden items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Messages
            </h1>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigate('/groups/create')}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
              title="Create Group"
              aria-label="Create Group"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages, people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-dark-card rounded-xl text-sm border border-slate-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-dark-muted transition-all"
            aria-label="Search messages and contacts"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Horizontal Quick Status / Story Area */}
        <div className="py-2 mb-2 border-b border-slate-200/70 dark:border-dark-border/60">
          <div className="flex items-center space-x-3.5 overflow-x-auto no-scrollbar scroll-smooth px-0.5 py-1">
            {/* 1. Current User's Story ("Your story") */}
            <div
              onClick={() => {
                if (hasMyStories) {
                  setSelectedStoryGroup(myStoryGroup);
                } else {
                  setCreateStoryModalOpen(true);
                }
              }}
              className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group"
              title={hasMyStories ? 'View your story' : 'Add story'}
            >
              <div className="relative">
                <div
                  className={`p-0.5 rounded-full transition-transform active:scale-95 ${
                    hasMyStories
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                      : 'border-2 border-dashed border-slate-300 dark:border-dark-border'
                  }`}
                >
                  <div className="p-0.5 bg-white dark:bg-dark-base rounded-full">
                    <Avatar
                      src={user?.profilePicture}
                      name={user?.fullName || user?.username || 'You'}
                      size="sm"
                      className="w-12 h-12 rounded-full"
                    />
                  </div>
                </div>

                {/* Plus Badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateStoryModalOpen(true);
                  }}
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-600 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-dark-surface shadow-xs active:scale-90 transition-transform"
                  title="Add to story"
                  aria-label="Add story"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 max-w-[62px] truncate">
                Your story
              </span>
            </div>

            {/* 2. Loading Skeletons */}
            {loadingStories && (
              <>
                {[1, 2, 3].map((sk) => (
                  <div key={`story-skel-${sk}`} className="flex flex-col items-center space-y-1 flex-shrink-0 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-dark-hover" />
                    <div className="h-2 w-10 bg-slate-200 dark:bg-dark-hover rounded-full" />
                  </div>
                ))}
              </>
            )}

            {/* 3. Real Followed Users Stories */}
            {!loadingStories &&
              otherStoryGroups.map((group) => {
                const author = group.user || {};
                const name = author.fullName || author.username || 'Friend';
                return (
                  <div
                    key={group._id || author._id}
                    onClick={() => setSelectedStoryGroup(group)}
                    className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group"
                    title={`View story by ${name}`}
                  >
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 transition-transform active:scale-95 group-hover:scale-105">
                      <div className="p-0.5 bg-white dark:bg-dark-base rounded-full">
                        <Avatar
                          src={author.profilePicture}
                          name={name}
                          size="sm"
                          className="w-12 h-12 rounded-full"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[64px] truncate text-center">
                      {author.username || name}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section 6: Messages / Requests Switcher */}
        <div className="flex items-center space-x-6 border-b border-slate-200 dark:border-dark-border px-1 mb-2">
          <button
            onClick={() => setMainTab('messages')}
            className={`pb-2.5 text-sm font-bold relative transition-colors ${
              mainTab === 'messages'
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            aria-label="Messages list"
          >
            <span>Messages</span>
            {totalUnread > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            {mainTab === 'messages' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setMainTab('requests')}
            className={`pb-2.5 text-sm font-bold relative transition-colors ${
              mainTab === 'requests'
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            aria-label="Connection and message requests"
          >
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-500 text-white shadow-xs">
                {pendingRequests.length}
              </span>
            )}
            {mainTab === 'requests' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Sub Filter Chips (Only in Messages tab) */}
        {mainTab === 'messages' && (
          <div className="flex items-center space-x-1 pb-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex-shrink-0 ${
                  filterTab === tab.id
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-dark-hover'
                }`}
                aria-label={`Filter by ${tab.label}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 pb-28 md:pb-6 space-y-1">
        {mainTab === 'messages' ? (
          /* MESSAGES LIST VIEW */
          loadingConversations ? (
            <ChatSkeleton />
          ) : filteredConversations.length > 0 ? (
            <>
              {filteredConversations.map((conv) => (
                <ChatItem
                  key={conv._id}
                  conversation={conv}
                  isActive={activeConversation?._id === conv._id}
                  onClick={() => handleChatClick(conv)}
                />
              ))}

              {/* People You May Know - Clean discovery section after conversations */}
              {!searchTerm.trim() && filterTab === 'all' && (
                <div className="pt-3 pb-2 border-t border-slate-200/60 dark:border-dark-border/40 mt-3">
                  <PeopleSuggestions layout="compact" limit={4} title="People you may know" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-start text-center px-2 py-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2.5">
                <MessageSquareDashed className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {searchTerm ? 'No conversations found' : 'No conversations yet'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-dark-muted mt-0.5 max-w-[220px]">
                {searchTerm
                  ? 'No chats match your search query.'
                  : 'Start chatting with people you know.'}
              </p>
              {!searchTerm ? (
                <div className="w-full mt-4 text-left">
                  <PeopleSuggestions layout="compact" limit={6} title="People you may know" />
                </div>
              ) : (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-3.5 py-1.5 bg-slate-200 dark:bg-dark-hover hover:bg-slate-300 dark:hover:bg-dark-border text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )
        ) : (
          /* REQUESTS LIST VIEW (Section 6) */
          <div className="space-y-2 py-1">
            {loadingRequests ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((n) => (
                  <div key={`req-skel-${n}`} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-dark-hover" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-dark-hover rounded-full" />
                      <div className="h-2.5 w-20 bg-slate-200 dark:bg-dark-hover rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length > 0 ? (
              <>
                <div className="px-2 pt-1 pb-1">
                  <p className="text-xs text-slate-500 dark:text-dark-muted">
                    Accept requests to start messaging and sharing photos.
                  </p>
                </div>
                {pendingRequests.map((req) => {
                  const requester = req.user || req.requester || {};
                  const isActing = actionLoadingId === req._id;

                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs hover:border-brand-500/30 transition-all"
                    >
                      <div
                        onClick={() => navigate(`/profile/${requester._id}`)}
                        className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1 mr-2"
                      >
                        <Avatar
                          src={requester.profilePicture}
                          name={requester.fullName || requester.username}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {requester.fullName || requester.username}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-dark-muted truncate">
                            @{requester.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req._id, requester._id)}
                          disabled={isActing}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors active:scale-95 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req._id, requester._id)}
                          disabled={isActing}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-hover dark:hover:bg-dark-border text-slate-600 dark:text-slate-300 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-dark-muted">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2.5">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No message requests
                </h4>
                <p className="text-xs text-slate-400 dark:text-dark-muted mt-1 max-w-[240px]">
                  When people you haven't connected with send you a connection or message request, it will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals for Stories */}
      {selectedStoryGroup && (
        <StoryViewerModal
          storyGroup={selectedStoryGroup}
          onClose={() => setSelectedStoryGroup(null)}
          onNextGroup={() => {
            const idx = otherStoryGroups.findIndex(
              (g) => g._id === selectedStoryGroup._id
            );
            if (idx >= 0 && idx < otherStoryGroups.length - 1) {
              setSelectedStoryGroup(otherStoryGroups[idx + 1]);
            } else {
              setSelectedStoryGroup(null);
            }
          }}
          onPrevGroup={() => {
            const idx = otherStoryGroups.findIndex(
              (g) => g._id === selectedStoryGroup._id
            );
            if (idx > 0) {
              setSelectedStoryGroup(otherStoryGroups[idx - 1]);
            } else if (hasMyStories) {
              setSelectedStoryGroup(myStoryGroup);
            }
          }}
        />
      )}

      {createStoryModalOpen && (
        <CreateStoryModal
          isOpen={createStoryModalOpen}
          onClose={() => setCreateStoryModalOpen(false)}
          onStoryCreated={() => {
            fetchStories();
          }}
        />
      )}
    </div>
  );
};

export default ChatList;
