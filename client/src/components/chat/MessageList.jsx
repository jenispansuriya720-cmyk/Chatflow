import React, { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, ChevronUp, ChevronDown, X, MessageSquareDashed } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useChatTheme } from '../../context/ChatThemeContext';
import MessageBubble from './MessageBubble';
import { MessageSkeleton } from '../common/LoadingSpinner';
import MediaPreviewModal from '../modals/MediaPreviewModal';
import ForwardModal from '../modals/ForwardModal';

const MessageList = ({ isSearchOpen, onCloseSearch }) => {
  const { activeConversation, messages, loadingMessages } = useChat();
  const { wallpaper, wallpaperOpacity } = useChatTheme();

  const [inChatSearch, setInChatSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (!inChatSearch) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, inChatSearch]);

  // Search match computation
  const matchingIndices = React.useMemo(() => {
    if (!inChatSearch.trim()) return [];
    const query = inChatSearch.toLowerCase();
    const indices = [];
    messages.forEach((msg, idx) => {
      if (msg.text && msg.text.toLowerCase().includes(query)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [messages, inChatSearch]);

  const scrollToMatch = (matchIdx) => {
    if (matchingIndices.length === 0) return;
    const targetMessageIndex = matchingIndices[matchIdx];
    const targetMsg = messages[targetMessageIndex];
    if (targetMsg) {
      const el = document.getElementById(`msg-${targetMsg._id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchingIndices.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchingIndices.length;
    setCurrentMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matchingIndices.length === 0) return;
    const prevIdx =
      (currentMatchIndex - 1 + matchingIndices.length) % matchingIndices.length;
    setCurrentMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  // Group messages by date
  const renderDateSeparator = (dateStr) => {
    const d = new Date(dateStr);
    let label = format(d, 'MMMM d, yyyy');
    if (isToday(d)) label = 'Today';
    if (isYesterday(d)) label = 'Yesterday';

    return (
      <div className="flex items-center justify-center my-4 select-none">
        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/80 dark:bg-dark-hover text-slate-600 dark:text-dark-muted shadow-xs">
          {label}
        </span>
      </div>
    );
  };

  if (!activeConversation) return null;

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      style={{
        backgroundColor: 'var(--chat-bg)',
        backgroundImage: wallpaper ? `url("${wallpaper}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Readability Scrim Overlay when wallpaper is active */}
      {wallpaper && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            backgroundColor: 'var(--chat-bg)',
            opacity: 1 - (wallpaperOpacity || 80) / 100,
          }}
        />
      )}
      {/* In-chat search bar */}
      {isSearchOpen && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border z-10 animate-slide-up">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search in this conversation..."
              value={inChatSearch}
              onChange={(e) => {
                setInChatSearch(e.target.value);
                setCurrentMatchIndex(0);
              }}
              autoFocus
              className="w-full bg-transparent text-sm focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {matchingIndices.length > 0 ? (
              <span>
                {currentMatchIndex + 1} of {matchingIndices.length}
              </span>
            ) : inChatSearch ? (
              <span>No results</span>
            ) : null}

            <button
              onClick={handlePrevMatch}
              disabled={matchingIndices.length === 0}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-hover disabled:opacity-30"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextMatch}
              disabled={matchingIndices.length === 0}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-hover disabled:opacity-30"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            <button
              onClick={onCloseSearch}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message scroll list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-2 md:px-6 py-4 space-y-1 relative z-10"
      >
        {loadingMessages ? (
          <MessageSkeleton />
        ) : messages.length > 0 ? (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDate =
              !prevMsg ||
              new Date(msg.createdAt).toDateString() !==
                new Date(prevMsg.createdAt).toDateString();

            const isMatch =
              inChatSearch.trim() &&
              msg.text &&
              msg.text.toLowerCase().includes(inChatSearch.toLowerCase());

            return (
              <React.Fragment key={msg._id || idx}>
                {showDate && renderDateSeparator(msg.createdAt)}
                <MessageBubble
                  message={msg}
                  isGroup={activeConversation.type === 'group'}
                  onOpenMedia={(media) => setSelectedMedia(media)}
                  onForward={(message) => setForwardingMessage(message)}
                  highlight={isMatch}
                />
              </React.Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 select-none">
            <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3">
              <MessageSquareDashed className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No messages yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 max-w-xs">
              Say hello or share a message to start the real-time conversation!
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Lightbox / Media Viewer Modal */}
      {selectedMedia && (
        <MediaPreviewModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </div>
  );
};

export default MessageList;
