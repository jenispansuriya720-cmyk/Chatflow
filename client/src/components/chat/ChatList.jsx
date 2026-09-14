import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserPlus, MessageSquareDashed, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatItem from './ChatItem';
import { ChatSkeleton } from '../common/LoadingSpinner';

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
      <div className="p-4 pb-2 border-b border-slate-200 dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
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
              className="p-2 rounded-xl text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
              title="Create New Group"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="p-2 rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
              title="Start New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
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
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
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
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loadingConversations ? (
          <ChatSkeleton />
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <ChatItem
              key={conv._id}
              conversation={conv}
              isActive={activeConversation?._id === conv._id}
              onClick={() => handleChatClick(conv)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-dark-hover flex items-center justify-center text-slate-400 mb-3">
              <MessageSquareDashed className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No conversations found
            </h4>
            <p className="text-xs text-slate-400 dark:text-dark-muted mt-1 max-w-[200px]">
              {searchTerm
                ? 'No chats match your search query.'
                : 'Start a conversation with a teammate or friend.'}
            </p>
            <button
              onClick={() => navigate('/contacts')}
              className="mt-4 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
            >
              Find People
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
