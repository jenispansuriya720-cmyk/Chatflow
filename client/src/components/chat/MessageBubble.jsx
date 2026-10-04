import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Reply,
  Smile,
  Copy,
  Forward,
  Edit2,
  Trash2,
  FileText,
  Download,
  Play,
  Pause,
  AlertCircle,
  Clock,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import ReportModal from '../modals/ReportModal';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MORE_REACTIONS = [
  '🔥', '🎉', '💯', '👏', '🤝', '🚀',
  '🥰', '😍', '😎', '🥳', '🤔', '👀',
  '🥺', '😡', '✨', '⚡', '💖', '🙌',
  '💔', '🤯', '😴', '🫡', '🤤', '🫠',
];

const MessageBubble = ({
  message,
  onOpenMedia,
  onForward,
  isGroup = false,
  highlight = false,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const { user } = useAuth();
  const { setReplyingTo, reactToMessage, editMessage, deleteMessage } = useChat();

  // Strict ownership check
  const isOwn = Boolean(
    user?._id &&
      (message.sender?._id || message.senderId || message.sender)?.toString() ===
        user._id.toString()
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showMoreEmojis, setShowMoreEmojis] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState('for_everyone');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const msgWrapperRef = useRef(null);
  const desktopReactionPickerRef = useRef(null);
  const desktopMenuRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isTouchMoved = useRef(false);
  const longPressTimerRef = useRef(null);
  const audioRef = useRef(null);

  const [collisionState, setCollisionState] = useState({
    placeBelow: false,
    shiftX: 0,
    rectTop: 300,
  });

  // Calculate viewport collision and position dynamically (Section 10, 11)
  const updateCollisionPosition = () => {
    if (!msgWrapperRef.current) return;
    const rect = msgWrapperRef.current.getBoundingClientRect();

    // If message scrolled out of visible viewport, close floating picker (Section 11)
    if (rect.bottom < 40 || rect.top > window.innerHeight - 40) {
      setReactionBarOpen(false);
      setMenuOpen(false);
      setShowMoreEmojis(false);
      return;
    }

    // Top & Bottom collision handling:
    // ChatHeader takes ~70px. Floating reaction bar height is ~44px.
    // If rect.top < 125px, there is not enough room above -> place below message.
    // If rect.bottom > window.innerHeight - 90px (near composer), prefer placing above.
    let placeBelow = rect.top < 125;
    if (rect.bottom > window.innerHeight - 90) {
      placeBelow = false;
    }

    // Horizontal collision:
    // Dynamically measure actual reaction bar width (fallback ~340px)
    const pickerWidth = desktopReactionPickerRef.current?.offsetWidth || 340;
    let shiftX = 0;

    if (isOwn) {
      // Sent message: right-0 aligns to right edge of bubble.
      // Left edge will be at rect.right - pickerWidth
      const expectedRight = rect.right;
      const expectedLeft = expectedRight - pickerWidth;
      if (expectedLeft < 16) {
        shiftX = 16 - expectedLeft; // Shift right to stay inside viewport
      }
      if (expectedRight + shiftX > window.innerWidth - 16) {
        shiftX = (window.innerWidth - 16) - expectedRight; // Clamp right edge
      }
    } else {
      // Received message: left-0 aligns to left edge of bubble.
      // Right edge will be at rect.left + pickerWidth
      const expectedLeft = rect.left;
      const expectedRight = expectedLeft + pickerWidth;
      if (expectedRight > window.innerWidth - 16) {
        shiftX = (window.innerWidth - 16) - expectedRight; // Shift left to stay inside viewport
      }
      if (expectedLeft + shiftX < 16) {
        shiftX = 16 - expectedLeft; // Clamp left edge
      }
    }

    setCollisionState({ placeBelow, shiftX, rectTop: rect.top });
  };

  // Close desktop floating popups when scrolling or clicking outside or Esc (Section 11, 22)
  useEffect(() => {
    if (!menuOpen && !reactionBarOpen && !showMoreEmojis) return;

    const handleScrollOrOutsideClick = (e) => {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(e.target) &&
        desktopReactionPickerRef.current &&
        !desktopReactionPickerRef.current.contains(e.target) &&
        msgWrapperRef.current &&
        !msgWrapperRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
        setReactionBarOpen(false);
        setShowMoreEmojis(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCollisionPosition();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setReactionBarOpen(false);
        setMobileSheetOpen(false);
        setShowMoreEmojis(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleScrollOrOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleScrollOrOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, reactionBarOpen, showMoreEmojis, isOwn]);

  // Format time
  const time = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  // Copy text handler
  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setMenuOpen(false);
      setMobileSheetOpen(false);
    }
  };

  // Reply handler (Section 11, 12)
  const handleReply = () => {
    setReplyingTo(message);
    setMenuOpen(false);
    setMobileSheetOpen(false);
  };

  // Touch handlers for mobile long press (Section 4)
  const handleTouchStart = (e) => {
    if (message.isDeleted || isEditing) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isTouchMoved.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!isTouchMoved.current) {
        setMobileSheetOpen(true);
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 450);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      isTouchMoved.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Right-click desktop context menu handler
  const handleContextMenu = (e) => {
    if (message.isDeleted || isEditing) return;
    e.preventDefault();
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true);
    } else {
      updateCollisionPosition();
      setMenuOpen(true);
      setReactionBarOpen(false);
    }
  };

  // Edit save
  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await editMessage(message._id, editText);
    setIsEditing(false);
  };

  // Confirm delete message
  const handleConfirmDelete = async () => {
    await deleteMessage(message._id, isOwn ? deleteOption : 'for_me');
  };

  // Audio play/pause toggle
  const togglePlayAudio = (audioUrl) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  const hasReacted = (emoji) => {
    if (!user?._id) return false;
    const currentUid = user._id.toString();
    return (message.reactions || []).some((r) => {
      const rUid = (r.user?._id || r.user || r.userId)?.toString();
      return rUid === currentUid && r.emoji === emoji;
    });
  };

  // Modern bubble corner geometry based on sender and burst grouping
  const getBubbleCorners = () => {
    if (isFirstInGroup && isLastInGroup) return 'bubble-group-first-last rounded-2xl';
    if (isFirstInGroup && !isLastInGroup) return 'bubble-group-first rounded-2xl';
    if (!isFirstInGroup && !isLastInGroup) return 'bubble-group-middle rounded-2xl';
    return 'bubble-group-last rounded-2xl';
  };

  // Genuine shared post/reel check (never show on normal messages)
  const isSharedMedia =
    (message.type === 'shared_post' ||
      message.type === 'shared_reel' ||
      message.type === 'shared_story') &&
    message.sharedContent &&
    Boolean(
      message.sharedContent.mediaUrl ||
        message.sharedContent.thumbnailUrl ||
        message.sharedContent.titleOrCaption
    );

  return (
    <>
      <div
        id={`msg-${message._id}`}
        className={`group relative flex items-start space-x-2 px-3 sm:px-4 chat-message-row transition-all duration-200 ${
          isOwn ? 'justify-end' : 'justify-start'
        } ${isFirstInGroup ? 'mt-3 sm:mt-3.5' : 'mt-0.5'} ${
          highlight ? 'bg-brand-500/10 rounded-2xl py-2 ring-1 ring-brand-500/30' : ''
        }`}
      >
        {/* Sender Avatar for received messages (only shown on the first message of consecutive bursts) */}
        {!isOwn && (
          <div className="w-8 flex-shrink-0 flex items-start self-start pt-0.5">
            {isFirstInGroup ? (
              <Avatar
                src={message.sender?.profilePicture}
                name={message.sender?.fullName || message.sender?.username}
                size="sm"
                className="w-8 h-8 rounded-full object-cover shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 flex-shrink-0" />
            )}
          </div>
        )}

        {/* Message Content Container */}
        <div
          className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col ${
            isOwn ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender Name in Group (only shown on the first message in the burst) */}
          {!isOwn && isGroup && isFirstInGroup && (
            <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mb-1 px-1 select-none">
              {message.sender?.fullName || message.sender?.username}
            </span>
          )}

          {/* Message Wrapper (Positioning context strictly for this message bubble) */}
          <div
            ref={msgWrapperRef}
            onMouseEnter={updateCollisionPosition}
            className="relative inline-flex flex-col max-w-full w-fit group/msg"
            style={{ width: 'fit-content' }}
          >
            {/* Message Bubble Card */}
            <div
              onClick={(e) => {
                if (e.target.closest('button, a, video, audio, input, textarea, img')) return;
                if (window.innerWidth >= 768 && !message.isDeleted && !isEditing) {
                  updateCollisionPosition();
                  setReactionBarOpen((prev) => !prev);
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onContextMenu={handleContextMenu}
              className={`relative px-4 py-2.5 shadow-xs text-sm break-words transition-all duration-200 cursor-pointer md:cursor-default ${getBubbleCorners()} ${
              message.isDeleted
                ? 'italic text-slate-400 bg-slate-100 dark:bg-dark-hover border border-dashed border-slate-300 dark:border-dark-border'
                : isOwn
                ? 'chat-bubble-out text-white shadow-sm'
                : 'chat-bubble-in text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-dark-border shadow-xs'
            }`}
            style={
              message.isDeleted
                ? {}
                : isOwn
                ? {
                    background:
                      'var(--chat-outgoing, linear-gradient(135deg, #4f46e5 0%, #6366f1 100%))',
                    color: 'var(--chat-outgoing-text, #ffffff)',
                  }
                : {
                    backgroundColor: 'var(--chat-incoming, #ffffff)',
                    color: 'var(--chat-incoming-text, #0f172a)',
                    borderColor: 'var(--chat-border, #e2e8f0)',
                  }
            }
          >
            {/* Deleted state */}
            {message.isDeleted ? (
              <div className="flex items-center space-x-2 py-0.5 select-none">
                <AlertCircle className="w-4 h-4 opacity-70" />
                <span>This message was deleted.</span>
              </div>
            ) : isEditing ? (
              /* Inline Edit Box */
              <div className="space-y-2 py-1 min-w-[200px]">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2 bg-black/20 text-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-white resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center justify-end space-x-2 text-xs">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded bg-black/30 hover:bg-black/40 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-2.5 py-1 rounded bg-white text-brand-600 font-semibold hover:bg-slate-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Quoted Replied-To Message Preview Inside Bubble (Sections 11, 12, 13, 14, 15, 16) */}
                {message.replyTo && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetId = message.replyTo._id || message.replyTo;
                      if (targetId) {
                        const el = document.getElementById(`msg-${targetId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('reply-highlight-pulse');
                          setTimeout(() => {
                            el.classList.remove('reply-highlight-pulse');
                          }, 2000);
                        }
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="View original message"
                    className={`w-full mb-2 p-2 sm:p-2.5 rounded-xl border-l-[3.5px] select-none cursor-pointer transition-all duration-150 hover:brightness-95 active:scale-[0.99] flex items-center justify-between gap-2.5 overflow-hidden text-left ${
                      isOwn
                        ? 'bg-black/20 border-white/90 text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-800 dark:text-slate-100'
                    }`}
                    style={
                      !isOwn
                        ? {
                            borderLeftColor: 'var(--chat-accent, #4f46e5)',
                          }
                        : {}
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className={`font-bold block text-xs truncate ${
                          isOwn ? 'text-white' : 'text-brand-600 dark:text-brand-400'
                        }`}
                        style={!isOwn ? { color: 'var(--chat-accent, #4f46e5)' } : {}}
                      >
                        {message.replyTo.isDeleted
                          ? 'Deleted message'
                          : message.replyTo.sender?.fullName ||
                            message.replyTo.sender?.username ||
                            'Replied message'}
                      </span>
                      <span className="truncate block text-xs opacity-85 mt-0.5 line-clamp-1">
                        {message.replyTo.isDeleted ? (
                          <span className="italic opacity-70">Original message was deleted</span>
                        ) : message.replyTo.text ? (
                          message.replyTo.text
                        ) : message.replyTo.type === 'image' || message.replyTo.imageUrl ? (
                          'Photo'
                        ) : message.replyTo.type === 'video' ? (
                          'Video'
                        ) : message.replyTo.voiceData?.duration ? (
                          'Voice note'
                        ) : message.replyTo.attachments?.length ? (
                          message.replyTo.attachments[0].name || 'Attachment'
                        ) : (
                          'Attachment'
                        )}
                      </span>
                    </div>

                    {/* Thumbnail if replying to image or video */}
                    {!message.replyTo.isDeleted &&
                      (message.replyTo.imageUrl ||
                        message.replyTo.attachments?.some((a) => a.fileType === 'image') ||
                        message.replyTo.type === 'image') && (
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-white/20 shadow-xs">
                          <img
                            src={
                              message.replyTo.imageUrl ||
                              message.replyTo.attachments?.find((a) => a.fileType === 'image')?.url
                            }
                            alt="Replied preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                    {!message.replyTo.isDeleted &&
                      (message.replyTo.type === 'video' ||
                        message.replyTo.attachments?.some((a) => a.fileType === 'video')) &&
                      !message.replyTo.imageUrl && (
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">
                          🎥
                        </div>
                      )}
                  </div>
                )}

                {/* Media Attachments & Direct Image (Rendered directly inside bubble without @creator POST) */}
                {((message.attachments && message.attachments.length > 0) || message.imageUrl) && (
                  <div className="space-y-1.5 mb-1.5">
                    {/* Direct Image URL */}
                    {message.imageUrl &&
                      (!message.attachments ||
                        !message.attachments.some((a) => a.url === message.imageUrl)) && (
                        <div className="rounded-xl overflow-hidden shadow-xs">
                          <img
                            src={message.imageUrl}
                            alt="Photo"
                            onClick={() =>
                              onOpenMedia &&
                              onOpenMedia({
                                url: message.imageUrl,
                                fileType: 'image',
                                name: 'Photo',
                              })
                            }
                            className="max-h-80 w-auto max-w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                            loading="lazy"
                          />
                        </div>
                      )}

                    {message.attachments &&
                      message.attachments.map((att, idx) => {
                        const isImg =
                          att.fileType === 'image' ||
                          att.mimeType?.startsWith('image/') ||
                          Boolean(att.url?.match(/\.(jpeg|jpg|gif|png|webp)/i));

                        return (
                          <div key={idx} className="rounded-xl overflow-hidden shadow-xs">
                            {isImg ? (
                              <img
                                src={att.url}
                                alt={att.name || 'Photo'}
                                onClick={() =>
                                  onOpenMedia &&
                                  onOpenMedia({
                                    url: att.url,
                                    fileType: 'image',
                                    name: att.name || 'Photo',
                                  })
                                }
                                className="max-h-80 w-auto max-w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                loading="lazy"
                              />
                            ) : att.fileType === 'video' ? (
                              <video
                                src={att.url}
                                controls
                                className="max-h-80 w-full rounded-xl"
                              />
                            ) : (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download={att.name}
                                className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                                  isOwn
                                    ? 'bg-black/20 hover:bg-black/30'
                                    : 'bg-slate-100 dark:bg-dark-hover hover:bg-slate-200'
                                }`}
                              >
                                <FileText className="w-6 h-6 flex-shrink-0 text-brand-400" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold truncate">{att.name}</p>
                                  <p className="text-[10px] opacity-75">
                                    {Math.round((att.size || 0) / 1024)} KB
                                  </p>
                                </div>
                                <Download className="w-4 h-4 flex-shrink-0 opacity-75" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Voice Message Player */}
                {message.voiceData &&
                  (message.voiceData.duration > 0 ||
                    message.attachments?.some((a) => a.fileType === 'audio')) && (
                    <div className="flex items-center space-x-3 py-1.5 min-w-[210px]">
                      <button
                        onClick={() => {
                          const audioSrc = message.attachments?.find(
                            (a) => a.fileType === 'audio'
                          )?.url;
                          if (audioSrc) togglePlayAudio(audioSrc);
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                          isOwn ? 'bg-white text-brand-600' : 'bg-brand-600 text-white'
                        }`}
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-0.5 h-6">
                          {(message.voiceData?.waveform && message.voiceData.waveform.length > 0
                            ? message.voiceData.waveform
                            : [30, 60, 45, 80, 25, 90, 70, 50, 85, 40, 65, 30, 95, 55, 40, 20]
                          ).map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${Math.max(15, h)}%` }}
                              className={`w-1 rounded-full transition-all ${
                                isOwn ? 'bg-white/70' : 'bg-brand-500/70'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex justify-between text-[10px] opacity-80 font-mono">
                          <span>
                            0:{String(message.voiceData?.duration || 12).padStart(2, '0')}
                          </span>
                          <span>Voice note</span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Shared Post / Reel / Story Card (Only for genuine shared post items with valid media/title) */}
                {isSharedMedia && (
                  <div
                    className={`rounded-2xl overflow-hidden my-1.5 border select-none ${
                      isOwn
                        ? 'bg-black/25 border-white/20 text-white'
                        : 'bg-slate-50 dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {(message.sharedContent.mediaUrl || message.sharedContent.thumbnailUrl) && (
                      <img
                        src={message.sharedContent.mediaUrl || message.sharedContent.thumbnailUrl}
                        alt="Shared media"
                        className="w-full max-h-60 object-cover rounded-t-xl"
                        loading="lazy"
                      />
                    )}
                    {message.sharedContent.titleOrCaption && (
                      <p className="p-2.5 text-xs line-clamp-3 leading-relaxed">
                        {message.sharedContent.titleOrCaption}
                      </p>
                    )}
                  </div>
                )}

                {/* Poll Display */}
                {message.pollData?.question && (
                  <div className="rounded-2xl border border-white/20 p-3 my-1.5 space-y-2 bg-black/15 text-xs">
                    <p className="font-bold">{message.pollData.question}</p>
                    <div className="space-y-1.5">
                      {(message.pollData.options || []).map((opt, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-black/20 flex justify-between items-center"
                        >
                          <span>{opt.text}</span>
                          <span className="text-[10px] font-bold opacity-75">
                            {opt.votes?.length || 0} votes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Display */}
                {message.eventData?.title && (
                  <div className="rounded-2xl border border-brand-400/40 p-3 my-1.5 bg-brand-500/10 space-y-1 text-xs">
                    <p className="font-bold text-brand-300">📅 {message.eventData.title}</p>
                    {message.eventData.location && (
                      <p className="text-[11px] opacity-80">📍 {message.eventData.location}</p>
                    )}
                  </div>
                )}

                {/* Actual Real Message Text (Clean, no @creator POST prefix) */}
                {message.text && (
                  <p className="whitespace-pre-wrap leading-relaxed select-text chat-message-text break-words text-[13.5px] sm:text-sm">
                    {message.text}
                  </p>
                )}
              </>
            )}

            {/* Subtle Timestamp and Real Delivery / Read Status */}
            <div
              className={`flex items-center justify-end space-x-1.5 mt-1 text-[11px] select-none ${
                isOwn ? 'opacity-90' : 'opacity-70'
              }`}
              style={{
                color: isOwn
                  ? 'var(--chat-outgoing-text, #ffffff)'
                  : 'var(--chat-timestamp, #94a3b8)',
              }}
            >
              {message.isEdited && !message.isDeleted && (
                <span className="opacity-75 italic text-[10px]">edited</span>
              )}
              <span className="font-medium">{time}</span>

              {isOwn && !message.isDeleted && (
                <span className="ml-1 inline-flex items-center space-x-0.5">
                  {message.status === 'sending' ? (
                    <Clock className="w-3 h-3 opacity-70 animate-pulse" title="Sending..." />
                  ) : message.status === 'read' ? (
                    <span
                      className="inline-flex items-center space-x-0.5 text-cyan-300 font-semibold"
                      title="Read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="text-[9.5px]">Read</span>
                    </span>
                  ) : message.status === 'delivered' ? (
                    <span
                      className="inline-flex items-center space-x-0.5 text-white/80"
                      title="Delivered"
                    >
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[9.5px]">Delivered</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center space-x-0.5 text-white/80"
                      title="Sent"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[9.5px]">Sent</span>
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Floating Reaction Bar & Action Menu (Sections 1-10) */}
          {!message.isDeleted && (
            <div
              ref={desktopReactionPickerRef}
              className={`absolute z-30 hidden md:flex items-center transition-all duration-150 ${
                collisionState.placeBelow ? 'top-full mt-2' : 'bottom-full mb-2'
              } ${
                isOwn ? 'right-0' : 'left-0'
              } ${
                reactionBarOpen || menuOpen
                  ? 'opacity-100 pointer-events-auto scale-100'
                  : 'opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto group-hover/msg:scale-100 scale-95'
              }`}
              style={{
                width: 'max-content',
                minWidth: 'max-content',
                maxWidth: 'calc(100vw - 24px)',
                transform: collisionState.shiftX
                  ? `translateX(${collisionState.shiftX}px)`
                  : undefined,
              }}
            >
              {/* Floating pill container */}
              <div
                className="flex items-center gap-1 px-2 py-1.5 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border border-slate-200 dark:border-dark-border rounded-full shadow-lg"
                style={{
                  width: 'max-content',
                  minWidth: 'max-content',
                }}
              >
                {/* Quick Reactions: 👍 ❤️ 😂 😮 😢 🙏 */}
                <div
                  className="flex items-center gap-1"
                  role="toolbar"
                  aria-label="Quick reactions"
                >
                  {QUICK_REACTIONS.map((emoji) => {
                    const active = hasReacted(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reactToMessage(message._id, emoji);
                          setReactionBarOpen(false);
                          setShowMoreEmojis(false);
                        }}
                        aria-label={
                          active ? `Remove ${emoji} reaction` : `React with ${emoji}`
                        }
                        className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition-all duration-150 hover:scale-125 cursor-pointer flex-shrink-0 ${
                          active
                            ? 'bg-brand-500/20 ring-1 ring-brand-500 scale-110'
                            : 'hover:bg-slate-100 dark:hover:bg-dark-hover'
                        }`}
                        style={{ width: '36px', height: '36px' }}
                        title={active ? `Remove ${emoji}` : `React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  {/* ＋ Button for full emoji picker */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreEmojis((prev) => !prev);
                      }}
                      aria-label="More reactions"
                      className={`w-9 h-9 flex items-center justify-center text-xs font-bold rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors cursor-pointer flex-shrink-0 ${
                        showMoreEmojis
                          ? 'bg-slate-200 dark:bg-dark-hover text-brand-600'
                          : ''
                      }`}
                      style={{ width: '36px', height: '36px' }}
                      title="More reactions"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Full Emoji Picker Popover */}
                    {showMoreEmojis && (
                      <div
                        className={`absolute ${
                          collisionState.placeBelow || (collisionState.rectTop && collisionState.rectTop < 280)
                            ? 'top-full mt-2'
                            : 'bottom-full mb-2'
                        } ${
                          isOwn ? 'right-0' : 'left-0'
                        } w-64 p-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl grid grid-cols-6 gap-1 z-40 max-h-56 overflow-y-auto animate-slide-up`}
                        style={{
                          width: '260px',
                          maxWidth: 'calc(100vw - 32px)',
                        }}
                        role="dialog"
                        aria-label="Full emoji reactions picker"
                      >
                        {MORE_REACTIONS.map((emoji) => {
                          const active = hasReacted(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                reactToMessage(message._id, emoji);
                                setShowMoreEmojis(false);
                                setReactionBarOpen(false);
                              }}
                              aria-label={
                                active
                                  ? `Remove ${emoji} reaction`
                                  : `React with ${emoji}`
                              }
                              className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-transform hover:scale-125 cursor-pointer flex-shrink-0 ${
                                active
                                  ? 'bg-brand-500/20 ring-1 ring-brand-500'
                                  : 'hover:bg-slate-100 dark:hover:bg-dark-hover'
                              }`}
                              style={{ width: '36px', height: '36px' }}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Thin divider */}
                <div className="h-4 w-px bg-slate-200 dark:bg-dark-border mx-1 flex-shrink-0" />

                {/* Reply Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReply();
                  }}
                  aria-label="Reply"
                  className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-hover rounded-full transition-colors cursor-pointer flex-shrink-0"
                  style={{ width: '36px', height: '36px' }}
                  title="Reply"
                >
                  <Reply className="w-4 h-4" />
                </button>

                {/* Desktop More Menu Trigger */}
                <div className="relative flex-shrink-0" ref={desktopMenuRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((prev) => !prev);
                    }}
                    aria-label="More actions"
                    className={`w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-hover rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                      menuOpen
                        ? 'bg-slate-200 dark:bg-dark-hover text-brand-600'
                        : ''
                    }`}
                    style={{ width: '36px', height: '36px' }}
                    title="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Desktop Message Actions Dropdown */}
                  {menuOpen && (
                    <div
                      className={`absolute ${
                        collisionState.placeBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                      } ${
                        isOwn ? 'right-0' : 'left-0'
                      } w-44 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl py-1 z-40 text-xs font-medium animate-slide-up text-slate-700 dark:text-slate-200`}
                      style={{ width: '176px' }}
                      role="menu"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          setReactionBarOpen(true);
                          setShowMoreEmojis(true);
                        }}
                        aria-label="React"
                        className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors cursor-pointer"
                        role="menuitem"
                      >
                        <Smile className="w-4 h-4 text-slate-400" />
                        <span>React</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply();
                        }}
                        aria-label="Reply"
                        className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors cursor-pointer"
                        role="menuitem"
                      >
                        <Reply className="w-4 h-4 text-slate-400" />
                        <span>Reply</span>
                      </button>

                      {message.text && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                          }}
                          aria-label="Copy text"
                          className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors cursor-pointer"
                          role="menuitem"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copy</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          if (onForward) onForward(message);
                        }}
                        aria-label="Forward message"
                        className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors cursor-pointer"
                        role="menuitem"
                      >
                        <Forward className="w-4 h-4 text-slate-400" />
                        <span>Forward</span>
                      </button>

                      {isOwn && message.text && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            setIsEditing(true);
                          }}
                          aria-label="Edit message"
                          className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors cursor-pointer"
                          role="menuitem"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                          <span>Edit</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-dark-border my-1" />

                      {isOwn ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            setDeleteModalOpen(true);
                          }}
                          aria-label="Delete message"
                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors cursor-pointer"
                          role="menuitem"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            setReportModalOpen(true);
                          }}
                          aria-label="Report message"
                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors cursor-pointer"
                          role="menuitem"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reactions Pill Display (Section 10) */}
        {Object.keys(groupedReactions).length > 0 && !message.isDeleted && (
          <div
            className={`flex flex-wrap gap-1 mt-1 px-1 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
            role="group"
            aria-label="Message reactions"
          >
            {Object.entries(groupedReactions).map(([emoji, count]) => {
              const active = hasReacted(emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    reactToMessage(message._id, emoji);
                  }}
                  aria-label={
                    active ? `Remove ${emoji} reaction` : `React with ${emoji}`
                  }
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-400 scale-105'
                      : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:scale-105'
                  }`}
                  style={
                    active
                      ? {
                          borderColor: 'var(--chat-accent, #4f46e5)',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        }
                      : {}
                  }
                  title={
                    active
                      ? 'Tap to remove reaction'
                      : `${count} reaction${count > 1 ? 's' : ''}`
                  }
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete message?"
        description="This message will be removed from the conversation."
        confirmLabel="Delete"
        showOptions={isOwn}
        selectedOption={deleteOption}
        onOptionChange={setDeleteOption}
        isOwn={isOwn}
      />

      {/* Mobile Action Bottom Sheet (Sections 4 & 5) */}
      {mobileSheetOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Message actions"
          style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
        >
          {/* Backdrop */}
          <div
            onClick={() => {
              setMobileSheetOpen(false);
              setShowMoreEmojis(false);
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Card */}
          <div className="relative z-10 w-full bg-white dark:bg-dark-card rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl border-t border-slate-200 dark:border-dark-border animate-slide-up">
            {/* Drag handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-dark-border mx-auto mb-3" />

            {/* Touch-Friendly Reaction Bar with ~44px targets (Section 5) */}
            <div className="flex items-center justify-between gap-1 py-1.5 px-1 bg-slate-100 dark:bg-dark-hover rounded-2xl mb-3 shadow-inner w-full max-w-sm mx-auto">
              {QUICK_REACTIONS.map((emoji) => {
                const active = hasReacted(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      reactToMessage(message._id, emoji);
                      setMobileSheetOpen(false);
                      setShowMoreEmojis(false);
                    }}
                    aria-label={
                      active ? `Remove ${emoji} reaction` : `React with ${emoji}`
                    }
                    className={`flex-1 min-w-0 max-w-[44px] h-11 min-h-[44px] flex items-center justify-center text-xl sm:text-2xl rounded-xl transition-all active:scale-125 touch-manipulation cursor-pointer ${
                      active
                        ? 'bg-brand-500/20 ring-2 ring-brand-500 scale-105'
                        : 'hover:bg-slate-200/50 dark:hover:bg-dark-border/50'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}

              {/* ＋ Button for more emojis on mobile */}
              <button
                type="button"
                onClick={() => setShowMoreEmojis((prev) => !prev)}
                aria-label="More reactions"
                className={`flex-1 min-w-0 max-w-[44px] h-11 min-h-[44px] flex items-center justify-center text-lg font-bold rounded-xl text-slate-600 dark:text-slate-300 transition-colors touch-manipulation cursor-pointer ${
                  showMoreEmojis
                    ? 'bg-brand-500/20 text-brand-600 ring-1 ring-brand-500'
                    : 'hover:bg-slate-200/50 dark:hover:bg-dark-border/50'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Expanded Emoji Grid if ＋ tapped */}
            {showMoreEmojis && (
              <div className="grid grid-cols-6 gap-2 p-2 mb-3 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl max-h-48 overflow-y-auto animate-scale-in">
                {MORE_REACTIONS.map((emoji) => {
                  const active = hasReacted(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        reactToMessage(message._id, emoji);
                        setMobileSheetOpen(false);
                        setShowMoreEmojis(false);
                      }}
                      aria-label={
                        active
                          ? `Remove ${emoji} reaction`
                          : `React with ${emoji}`
                      }
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center text-xl rounded-xl transition-all active:scale-125 touch-manipulation cursor-pointer ${
                        active
                          ? 'bg-brand-500/20 ring-2 ring-brand-500'
                          : 'hover:bg-slate-200 dark:hover:bg-dark-hover'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action Items List with ~44px Touch Targets */}
            <div className="space-y-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              <button
                type="button"
                onClick={() => {
                  handleReply();
                  setMobileSheetOpen(false);
                  setShowMoreEmojis(false);
                }}
                aria-label="Reply"
                className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors touch-manipulation cursor-pointer"
              >
                <Reply className="w-5 h-5 text-slate-500" />
                <span>Reply</span>
              </button>

              {message.text && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopy();
                    setMobileSheetOpen(false);
                    setShowMoreEmojis(false);
                  }}
                  aria-label="Copy text"
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors touch-manipulation cursor-pointer"
                >
                  <Copy className="w-5 h-5 text-slate-500" />
                  <span>Copy Text</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileSheetOpen(false);
                  setShowMoreEmojis(false);
                  if (onForward) onForward(message);
                }}
                aria-label="Forward message"
                className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors touch-manipulation cursor-pointer"
              >
                <Forward className="w-5 h-5 text-slate-500" />
                <span>Forward</span>
              </button>

              {isOwn && message.text && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setShowMoreEmojis(false);
                    setIsEditing(true);
                  }}
                  aria-label="Edit message"
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors touch-manipulation cursor-pointer"
                >
                  <Edit2 className="w-5 h-5 text-slate-500" />
                  <span>Edit Message</span>
                </button>
              )}

              <div className="border-t border-slate-100 dark:border-dark-border my-1.5" />

              {isOwn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setShowMoreEmojis(false);
                    setDeleteModalOpen(true);
                  }}
                  aria-label="Delete message"
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors touch-manipulation cursor-pointer"
                >
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <span>Delete Message</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setShowMoreEmojis(false);
                    setReportModalOpen(true);
                  }}
                  aria-label="Report message"
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors touch-manipulation cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Report Message</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileSheetOpen(false);
                setShowMoreEmojis(false);
              }}
              className="w-full mt-3 py-3 rounded-2xl bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-300 font-bold text-sm min-h-[44px] flex items-center justify-center transition-colors touch-manipulation cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="message"
        targetId={message._id}
        targetUser={message.sender}
      />
    </>
  );
};

export default MessageBubble;
