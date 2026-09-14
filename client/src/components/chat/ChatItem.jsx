import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Pin, VolumeX, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';

const ChatItem = ({ conversation, isActive, onClick }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const { typingUsers } = useChat();

  const isGroup = conversation.type === 'group';

  // Determine other participant for direct chat
  const otherParticipant = !isGroup
    ? conversation.participants?.find((p) => p._id !== user?._id)
    : null;

  const displayName = isGroup
    ? conversation.groupName
    : otherParticipant?.fullName || otherParticipant?.username || 'Direct Message';

  const avatarSrc = isGroup
    ? conversation.groupImage
    : otherParticipant?.profilePicture;

  const isOnline = !isGroup && otherParticipant ? isUserOnline(otherParticipant._id) : false;

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const lastMsg = conversation.lastMessage;
  const timeDisplay = formatTime(lastMsg?.createdAt || conversation.updatedAt);

  // Check typing state for this conversation
  const typingList = typingUsers[conversation._id] || [];
  const isTyping = typingList.length > 0;

  // Format last message preview
  const renderMessagePreview = () => {
    if (isTyping) {
      return (
        <span className="text-brand-500 font-medium flex items-center space-x-1 animate-pulse">
          <span>{isGroup ? `${typingList[0]} is typing...` : 'typing...'}</span>
        </span>
      );
    }

    if (!lastMsg) {
      return <span className="italic text-slate-400">No messages yet</span>;
    }

    const isOwn = lastMsg.sender?._id === user?._id || lastMsg.sender === user?._id;

    let content = lastMsg.text;
    if (lastMsg.voiceData && lastMsg.voiceData.duration) {
      content = '🎙️ Voice message';
    } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
      const type = lastMsg.attachments[0].fileType;
      if (type === 'image') content = '📷 Photo';
      else if (type === 'video') content = '🎥 Video';
      else content = '📁 Document';
    }

    return (
      <span className="flex items-center space-x-1 truncate">
        {isOwn && (
          <span className="text-slate-400 inline-block mr-1 flex-shrink-0">
            {lastMsg.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-brand-500 inline" />
            ) : lastMsg.status === 'delivered' ? (
              <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline" />
            ) : (
              <Check className="w-3.5 h-3.5 text-slate-400 inline" />
            )}
          </span>
        )}
        <span className="truncate">{content}</span>
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center space-x-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
        isActive
          ? 'bg-brand-500/10 dark:bg-brand-500/15 text-slate-900 dark:text-white ring-1 ring-brand-500/20 shadow-sm'
          : 'hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-300'
      }`}
    >
      <Avatar
        src={avatarSrc}
        name={displayName}
        size="md"
        status={!isGroup ? (isOnline ? 'online' : 'offline') : null}
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {displayName}
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-dark-muted flex-shrink-0 font-medium ml-2">
            {timeDisplay}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-muted">
          <div className="truncate pr-2">{renderMessagePreview()}</div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {conversation.isMuted && (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 dark:text-dark-muted" />
            )}
            {conversation.isPinned && (
              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            )}
            {conversation.unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
