import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  UserPlus,
  MessageSquareDashed,
  X,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatItem from './ChatItem';
import { ChatSkeleton } from '../common/LoadingSpinner';
import PeopleSuggestions from './PeopleSuggestions';
import Avatar from '../common/Avatar';
import NoteModal from './NoteModal';

const ChatList = ({ onSelectChat }) => {
  const { conversations, activeConversation, selectConversation, loadingConversations } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'groups' | 'direct'
  const [searchTerm, setSearchTerm] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  // Total unread count
  const totalUnread = (conversations || []).reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  // User's active note text
  const userNoteText = user?.note?.text || '';

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
        {/* Mobile & Tablet Compact Header (< 1024px) */}
        <div className="flex lg:hidden items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Messages
            </h1>
            {totalUnread > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400 inline-block animate-pulse"
                title={`${totalUnread} unread messages`}
                aria-label={`${totalUnread} unread messages`}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/contacts')}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 active:scale-95 transition-all touch-manipulation"
            title="New Message"
            aria-label="New Message"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

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

        {/* Section 1 & 2: Your Note Area */}
        <div className="py-2.5 px-2 mb-2 border-b border-slate-200/70 dark:border-dark-border/60">
          <div
            onClick={() => setNoteModalOpen(true)}
            className="flex flex-col items-center justify-center cursor-pointer group select-none max-w-fit mx-auto"
            title={userNoteText ? 'Edit your note' : 'Share a thought'}
            aria-label="Your Note"
          >
            <div className="relative flex flex-col items-center">
              {/* Floating Note Thought Bubble if Note exists */}
              {userNoteText ? (
                <div className="relative mb-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xs text-xs font-medium text-slate-800 dark:text-slate-100 text-center max-w-[150px] truncate transition-transform group-hover:scale-105">
                  <span className="truncate">{userNoteText}</span>
                  {/* Bubble Pointer Tail */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-dark-card border-r border-b border-slate-200 dark:border-dark-border rotate-45" />
                </div>
              ) : null}

              {/* User Avatar */}
              <div className="relative">
                <Avatar
                  src={user?.profilePicture}
                  name={user?.fullName || user?.username || 'You'}
                  size="lg"
                  className="rounded-full shadow-xs ring-2 ring-slate-200/80 dark:ring-dark-border group-hover:ring-brand-500/40 transition-all"
                />

                {/* Small Plus Action Badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteModalOpen(true);
                  }}
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-600 hover:bg-brand-700 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-dark-surface shadow-xs active:scale-90 transition-transform"
                  title={userNoteText ? 'Edit note' : 'Add note'}
                  aria-label="Add note"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Note Label */}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              Your Note
            </span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-1.5 pb-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex-shrink-0 ${
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
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 pb-28 md:pb-6 space-y-1">
        {loadingConversations ? (
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

            {/* People You May Know */}
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
        )}
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        currentNote={user?.note}
        onNoteSaved={() => {}}
        onNoteDeleted={() => {}}
      />
    </div>
  );
};

export default ChatList;
