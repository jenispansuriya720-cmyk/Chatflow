import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  Phone,
  Video,
  Search,
  MoreVertical,
  Pin,
  VolumeX,
  Volume2,
  Trash2,
  LogOut,
  Info,
  Check,
  Radio,
  Palette,
  Image as ImageIcon,
  Shield,
  UserX,
  Flag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';
import BlockConfirmModal from '../modals/BlockConfirmModal';
import ReportModal from '../modals/ReportModal';

const ChatHeader = ({ onBack, onToggleSearch, onOpenInfo, onOpenTheme }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const {
    activeConversation,
    typingUsers,
    togglePinChat,
    toggleMuteChat,
    deleteMessage,
  } = useChat();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [callNotice, setCallNotice] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup
    ? activeConversation.participants?.find((p) => p._id !== user?._id)
    : null;

  const displayName = isGroup
    ? activeConversation.groupName
    : otherParticipant?.fullName || otherParticipant?.username || 'Direct Message';

  const avatarSrc = isGroup
    ? activeConversation.groupImage
    : otherParticipant?.profilePicture;

  const isOnline = !isGroup && otherParticipant ? isUserOnline(otherParticipant._id) : false;

  // Subtitle / presence
  const typingList = typingUsers[activeConversation._id] || [];
  const isTyping = typingList.length > 0;

  const getSubtitle = () => {
    if (isTyping) {
      return (
        <span className="text-brand-500 font-medium animate-pulse">
          {typingList.join(', ')} {typingList.length > 1 ? 'are' : 'is'} typing...
        </span>
      );
    }

    if (isGroup) {
      const totalMembers = activeConversation.participants?.length || 0;
      const onlineCount = activeConversation.participants?.filter((p) =>
        isUserOnline(p._id)
      ).length || 0;
      return `${totalMembers} members • ${onlineCount} online`;
    }

    if (isOnline) {
      return <span className="text-emerald-500 font-medium">● Online</span>;
    }

    return <span className="text-slate-400">Offline</span>;
  };

  const { startCall } = useCall();

  const handleStartCall = (type) => {
    if (isGroup) {
      navigate('/calls');
      return;
    }
    if (otherParticipant) {
      startCall(otherParticipant, type);
    }
  };

  const handleInviteToLive = () => {
    navigate('/live/broadcast');
  };

  return (
    <header className="relative flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border z-20 transition-colors">
      {/* Left: Back button (mobile) + Avatar + Info */}
      <div className="flex items-center space-x-2.5 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-slate-500 hover:text-slate-900 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
            title="Back to conversation list"
            aria-label="Back to conversation list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={onOpenInfo}
          className="cursor-pointer flex items-center space-x-3 min-w-0"
        >
          <Avatar
            src={avatarSrc}
            name={displayName}
            size="md"
            status={!isGroup ? (isOnline ? 'online' : 'offline') : null}
            className="flex-shrink-0"
          />

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {displayName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted truncate">
              {getSubtitle()}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => handleStartCall('audio')}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-dark-muted dark:hover:text-brand-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          title="Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleStartCall('video')}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-dark-muted dark:hover:text-brand-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={handleInviteToLive}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-red-500 dark:text-dark-muted dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          title="Go Live / Invite to Live"
        >
          <Radio className="w-4 h-4 text-red-500" />
        </button>

        <button
          onClick={onToggleSearch}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-dark-border py-1.5 z-50 animate-slide-up text-xs font-medium text-slate-700 dark:text-slate-200">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Chat Settings
              </div>

              {/* 🔔 Notifications */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  toggleMuteChat(activeConversation._id);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                {activeConversation.isMuted ? (
                  <>
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <span>Unmute Notifications</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>Mute Notifications</span>
                  </>
                )}
              </button>

              {/* 🎨 Chat Theme */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpenTheme) onOpenTheme();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span>Chat Theme</span>
              </button>

              {/* 🔍 Search in Conversation */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (onToggleSearch) onToggleSearch();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search in Conversation</span>
              </button>

              {/* 📌 Pinned Messages */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  togglePinChat(activeConversation._id);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Pin className="w-4 h-4 text-slate-400" />
                <span>{activeConversation.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
              </button>

              {/* 🖼 Media & Files */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpenInfo) onOpenInfo();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span>Media & Files</span>
              </button>

              {/* 🔒 Privacy & Info */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpenInfo) onOpenInfo();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Shield className="w-4 h-4 text-slate-400" />
                <span>{isGroup ? 'Group Privacy & Info' : 'Contact Privacy & Info'}</span>
              </button>

              {/* Direct chat safety actions */}
              {!isGroup && otherParticipant && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-dark-border" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowBlockModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    <UserX className="w-4 h-4 text-rose-500" />
                    <span>Block @{otherParticipant.username}</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowReportModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    <Flag className="w-4 h-4 text-rose-500" />
                    <span>Report User</span>
                  </button>
                </>
              )}

              {/* Close Chat Option */}
              {onBack && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-dark-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onBack();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-200 transition-colors font-semibold"
                    aria-label="Close chat"
                    title="Close chat"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                    <span>Close Chat</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop Close Chat Action Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Close chat"
            title="Close chat"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 ml-1 text-slate-600 hover:text-slate-900 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover border border-slate-200/80 dark:border-dark-border text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Block & Report Modals */}
      {showBlockModal && otherParticipant && (
        <BlockConfirmModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          targetUser={otherParticipant}
          onBlocked={() => {
            setShowBlockModal(false);
            if (onBack) onBack();
          }}
        />
      )}

      {showReportModal && otherParticipant && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="user"
          targetId={otherParticipant._id}
        />
      )}
    </header>
  );
};

export default ChatHeader;
