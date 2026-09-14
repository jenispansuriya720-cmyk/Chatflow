import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ChatThemeProvider, useChatTheme } from '../../context/ChatThemeContext';
import Sidebar from '../../components/layout/Sidebar';
import ChatList from '../../components/chat/ChatList';
import ChatHeader from '../../components/chat/ChatHeader';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';
import ConversationInfoDrawer from '../../components/modals/ConversationInfoDrawer';
import ChatThemePanel from '../../components/chat/theme/ChatThemePanel';

const ChatConversationArea = ({ onBackToChatList }) => {
  const { activeConversation } = useChat();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const { themeCssVars, bubbleStyle, fontSize, density } = useChatTheme();

  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup
    ? activeConversation.participants?.find(
        (p) => (p._id || p).toString() !== (user?._id || '').toString()
      )
    : null;
  const conversationName = isGroup
    ? activeConversation.groupName || 'Group Chat'
    : otherParticipant?.fullName || otherParticipant?.username || 'Chat';
  const conversationAvatar = isGroup
    ? activeConversation.groupImage
    : otherParticipant?.profilePicture;

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden relative chat-theme-scope bubble-style-${bubbleStyle} chat-font-${fontSize} chat-density-${density}`}
      style={{
        ...themeCssVars,
        backgroundColor: 'var(--chat-bg)',
      }}
    >
      {/* Conversation Top Header */}
      <ChatHeader
        onBack={onBackToChatList}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        onOpenInfo={() => setIsInfoOpen(!isInfoOpen)}
        onOpenTheme={() => setIsThemeOpen(true)}
      />

      {/* Messages Body */}
      <MessageList
        isSearchOpen={isSearchOpen}
        onCloseSearch={() => setIsSearchOpen(false)}
      />

      {/* Message Composer Footer */}
      <MessageInput />

      {/* Side Drawer for Conversation Info */}
      {isInfoOpen && (
        <ConversationInfoDrawer onClose={() => setIsInfoOpen(false)} />
      )}

      {/* Personal Chat Theme Customization Drawer */}
      {isThemeOpen && (
        <ChatThemePanel
          isOpen={isThemeOpen}
          onClose={() => setIsThemeOpen(false)}
          conversationName={conversationName}
          conversationAvatar={conversationAvatar}
        />
      )}
    </div>
  );
};

const ChatDashboard = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { activeConversation, selectConversation } = useChat();

  // Sync route params with active conversation
  useEffect(() => {
    if (conversationId) {
      if (!activeConversation || activeConversation._id !== conversationId) {
        selectConversation(conversationId);
      }
    }
  }, [conversationId, selectConversation, activeConversation]);

  // Handle mobile selection
  const handleSelectChat = (conv) => {
    navigate(`/chat/${conv._id}`);
  };

  const handleBackToChatList = () => {
    selectConversation(null);
    navigate('/chats');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-dark-base text-slate-900 dark:text-slate-100">
      {/* Primary Sidebar (Desktop/Tablet left bar, Mobile bottom bar) */}
      <Sidebar />

      {/* Responsive Chat Interface */}
      <div className="flex-1 flex h-full overflow-hidden relative">
        {/* Left Column: Chat List */}
        <div
          className={`h-full w-full md:w-80 lg:w-96 flex-shrink-0 transition-all duration-200 ${
            activeConversation ? 'hidden md:flex flex-col' : 'flex flex-col'
          }`}
        >
          <ChatList onSelectChat={handleSelectChat} />
        </div>

        {/* Right Column: Active Conversation or Empty Placeholder */}
        <div
          className={`flex-1 h-full flex flex-col transition-all duration-200 relative ${
            activeConversation ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <ChatThemeProvider conversationId={activeConversation._id}>
              <ChatConversationArea onBackToChatList={handleBackToChatList} />
            </ChatThemeProvider>
          ) : (
            /* Empty State on Desktop when no chat is open */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-dark-surface/30 select-none">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600/20 to-indigo-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
                <Sparkles className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                ChatFlow Messenger
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mt-2 leading-relaxed">
                Select a conversation from the left or connect with new teammates to begin instant, real-time messaging with rich media, voice notes, and reactions.
              </p>
              <button
                onClick={() => navigate('/contacts')}
                className="mt-6 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-brand-500/25 transition-all active:scale-95"
              >
                Explore Contacts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;
