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
import PeopleSuggestions from '../../components/chat/PeopleSuggestions';

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
    } else if (activeConversation) {
      selectConversation(null);
    }
  }, [conversationId]);

  // Handle selection from chat list
  const handleSelectChat = (conv) => {
    navigate(`/chat/${conv._id}`);
  };

  const handleBackToChatList = () => {
    selectConversation(null);
    navigate('/chats');
  };

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-white dark:bg-dark-base text-slate-900 dark:text-slate-100">
      {/* Primary Sidebar (Desktop/Tablet left bar, Mobile bottom bar) */}
      <Sidebar
        hideMobileNav={Boolean(activeConversation)}
        hideMobileHeader={true}
      />

      {/* Responsive Chat Interface */}
      <div className="flex-1 flex h-full overflow-hidden relative min-w-0">
        {/* Left Column: Chat List */}
        <div
          className={`h-full w-full lg:w-80 xl:w-96 flex-shrink-0 transition-all duration-200 ${
            activeConversation ? 'hidden lg:flex flex-col' : 'flex flex-col'
          }`}
        >
          <ChatList onSelectChat={handleSelectChat} />
        </div>

        {/* Right Column: Active Conversation or Empty Placeholder */}
        <div
          className={`flex-1 h-full flex flex-col transition-all duration-200 relative ${
            activeConversation ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeConversation ? (
            <ChatThemeProvider conversationId={activeConversation._id}>
              <ChatConversationArea onBackToChatList={handleBackToChatList} />
            </ChatThemeProvider>
          ) : (
            /* Empty State on Desktop when no chat is open */
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto bg-slate-50/50 dark:bg-dark-surface/30">
              <PeopleSuggestions layout="full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;
