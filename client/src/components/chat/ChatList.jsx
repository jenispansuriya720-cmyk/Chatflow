import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserPlus, MessageSquareDashed, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatItem from './ChatItem';
import { ChatSkeleton } from '../common/LoadingSpinner';
import PeopleSuggestions from './PeopleSuggestions';

const ChatList = ({ onSelectChat }) => {
  const { conversations, activeConversation, selectConversation, loadingConversations } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'groups' | 'direct'
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-surface/70 border-r border-slate-200 dark:border-dark-border select-none">
      {/* Header */}
      <div className="p-3 sm:p-4 pb-2 border-b border-slate-200 dark:border-dark-border">
        {/* Secondary Header Row - Visible only on desktop/tablet */}
        <div className="hidden md:flex items-center justify-between mb-3">
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
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
              title="Start New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2.5 md:mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chats, contacts, messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-dark-card rounded-xl text-sm border border-slate-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-dark-muted transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 pb-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                filterTab === tab.id
                  ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-dark-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 pb-28 md:pb-2 space-y-1">
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
            {!searchTerm.trim() && filterTab === 'all' && (
              <div className="pt-3 pb-2 border-t border-slate-200/60 dark:border-dark-border/40 mt-3">
                <PeopleSuggestions layout="compact" limit={4} title="People you may know" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-start text-center px-2 py-4">
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
              <div className="w-full mt-3 text-left">
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
    </div>
  );
};

export default ChatList;
