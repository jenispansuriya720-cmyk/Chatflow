import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import ReportModal from '../modals/ReportModal';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🔥'];

const MessageBubble = ({
  message,
  onOpenMedia,
  onForward,
  isGroup = false,
  highlight = false,
}) => {
  const { user } = useAuth();
  const { setReplyingTo, reactToMessage, editMessage, deleteMessage } = useChat();

  // Strict ownership check (Requirement 2 & 10)
  const isOwn = Boolean(
    user?._id &&
      (message.sender?._id || message.senderId || message.sender)?.toString() ===
        user._id.toString()
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState('for_everyone');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const audioRef = useRef(null);

  // Format time
  const time = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  // Copy text handler
  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setMenuOpen(false);
    }
  };

  // Reply handler
  const handleReply = () => {
    setReplyingTo(message);
    setMenuOpen(false);
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
    return (message.reactions || []).some(
      (r) => (r.user?._id === user?._id || r.user === user?._id) && r.emoji === emoji
    );
  };

  return (
    <>
      <div
        id={`msg-${message._id}`}
        className={`group relative flex items-end space-x-2 my-1 px-4 chat-message-row transition-all duration-300 ${
          isOwn ? 'justify-end' : 'justify-start'
        } ${highlight ? 'bg-brand-500/10 rounded-2xl py-2 ring-1 ring-brand-500/30' : ''}`}
      >
        {/* Sender Avatar for received messages in direct/group */}
        {!isOwn && (
          <Avatar
            src={message.sender?.profilePicture}
            name={message.sender?.fullName || message.sender?.username}
            size="sm"
            className="mb-1 flex-shrink-0"
          />
        )}

        {/* Message Content Container */}
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] flex flex-col ${
            isOwn ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender Name in Group */}
          {!isOwn && isGroup && (
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mb-1 px-1">
              {message.sender?.fullName || message.sender?.username}
            </span>
          )}

          {/* Quoted Reply if any */}
          {message.replyTo && !message.isDeleted && (
            <div
              className={`w-full mb-1 px-3 py-1.5 rounded-xl border-l-4 text-xs select-none ${
                isOwn
                  ? 'bg-brand-700/20 border-brand-400 text-slate-200'
                  : 'bg-slate-200 dark:bg-dark-hover border-brand-500 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-semibold block text-[11px]">
                {message.replyTo.sender?.fullName || 'Replied Message'}
              </span>
              <span className="truncate block opacity-85 text-[11px]">
                {message.replyTo.isDeleted
                  ? 'Original message was deleted'
                  : message.replyTo.text || 'Attachment'}
              </span>
            </div>
          )}

          {/* Message Bubble Card */}
          <div
            onClick={(e) => {
              if (e.target.closest('button, a, video, audio, input, textarea')) return;
              if (window.innerWidth < 768 && !message.isDeleted && !isEditing) {
                setMobileSheetOpen(true);
              }
            }}
            onContextMenu={(e) => {
              if (window.innerWidth < 768 && !message.isDeleted && !isEditing) {
                e.preventDefault();
                setMobileSheetOpen(true);
              }
            }}
            className={`relative px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words transition-all duration-200 cursor-pointer md:cursor-default ${
              message.isDeleted
                ? 'italic text-slate-400 bg-slate-100 dark:bg-dark-hover border border-dashed border-slate-300 dark:border-dark-border rounded-br-sm'
                : isOwn
                ? 'chat-bubble-out text-white rounded-br-sm shadow-md'
                : 'chat-bubble-in text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-dark-border rounded-bl-sm'
            }`}
            style={
              message.isDeleted
                ? {}
                : isOwn
                ? {
                    background: 'var(--chat-outgoing, linear-gradient(135deg, #4f46e5 0%, #6366f1 100%))',
                    color: 'var(--chat-outgoing-text, #ffffff)',
                  }
                : {
                    backgroundColor: 'var(--chat-incoming, #ffffff)',
                    color: 'var(--chat-incoming-text, #0f172a)',
                    borderColor: 'var(--chat-border, #e2e8f0)',
                  }
            }
          >
            {/* Deleted state (Requirements 11 & 26) */}
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
                {/* Media Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {message.attachments.map((att, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden">
                        {att.fileType === 'image' ? (
                          <img
                            src={att.url}
                            alt={att.name || 'Photo'}
                            onClick={() => onOpenMedia && onOpenMedia(att)}
                            className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                            loading="lazy"
                          />
                        ) : att.fileType === 'video' ? (
                          <video
                            src={att.url}
                            controls
                            className="max-h-72 w-full rounded-xl"
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
                    ))}
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

                {/* Shared Post / Reel / Story Card (Requirement 24) */}
                {message.sharedContent && (
                  <div
                    className={`rounded-2xl overflow-hidden my-2 border p-3 select-none ${
                      isOwn
                        ? 'bg-black/20 border-white/20 text-white'
                        : 'bg-slate-50 dark:bg-dark-hover border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {message.sharedContent.isUnavailable ? (
                      <div className="flex items-center space-x-2 py-2 text-rose-400 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>This content is no longer available.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold">
                            @{message.sharedContent.authorUsername || 'creator'}
                          </span>
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                            {message.sharedContent.contentType || 'post'}
                          </span>
                        </div>
                        {message.sharedContent.mediaUrl && (
                          <img
                            src={message.sharedContent.mediaUrl}
                            alt="Shared thumbnail"
                            className="w-full max-h-48 object-cover rounded-xl"
                            loading="lazy"
                          />
                        )}
                        {message.sharedContent.titleOrCaption && (
                          <p className="text-xs line-clamp-2 leading-relaxed opacity-90">
                            {message.sharedContent.titleOrCaption}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Poll Display */}
                {message.pollData?.question && (
                  <div className="rounded-2xl border border-white/20 p-3 my-2 space-y-2 bg-black/15 text-xs">
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
                  <div className="rounded-2xl border border-brand-400/40 p-3 my-2 bg-brand-500/10 space-y-1 text-xs">
                    <p className="font-bold text-brand-300">📅 {message.eventData.title}</p>
                    {message.eventData.location && (
                      <p className="text-[11px] opacity-80">📍 {message.eventData.location}</p>
                    )}
                  </div>
                )}

                {/* Text content */}
                {message.text && (
                  <p className="whitespace-pre-wrap leading-relaxed select-text chat-message-text">
                    {message.text}
                  </p>
                )}
              </>
            )}

            {/* Timestamp and Read Status (Requirement 5) */}
            <div
              className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] select-none ${
                isOwn ? 'opacity-90' : 'opacity-75'
              }`}
              style={{
                color: isOwn
                  ? 'var(--chat-outgoing-text, #ffffff)'
                  : 'var(--chat-timestamp, #94a3b8)',
              }}
            >
              {message.isEdited && !message.isDeleted && <span className="opacity-75">edited</span>}
              <span>{time}</span>

              {isOwn && !message.isDeleted && (
                <span className="ml-1 inline-flex items-center space-x-1">
                  {message.status === 'sending' ? (
                    <Clock className="w-3.5 h-3.5 opacity-70 animate-pulse" title="Sending..." />
                  ) : message.status === 'read' ? (
                    <span className="flex items-center space-x-0.5 text-cyan-300 font-medium">
                      <CheckCheck className="w-3.5 h-3.5 drop-shadow-xs" />
                      <span className="text-[9px]">Read</span>
                    </span>
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5 opacity-80 text-slate-200" title="Delivered" />
                  ) : (
                    <Check className="w-3.5 h-3.5 opacity-70 text-slate-200" title="Sent" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reactions Pill Display */}
          {Object.keys(groupedReactions).length > 0 && !message.isDeleted && (
            <div className="flex flex-wrap gap-1 mt-1 px-1">
              {Object.entries(groupedReactions).map(([emoji, count]) => {
                const active = hasReacted(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => reactToMessage(message._id, emoji)}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-all ${
                      active
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-400 scale-105'
                        : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:scale-105'
                    }`}
                    title={`${count} reactions`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[11px] font-bold">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover Action Bar (Requirements 10 & 30) */}
        {!message.isDeleted && (
          <div
            className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center space-x-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-md p-1 z-10 ${
              isOwn ? 'right-full mr-2' : 'left-full ml-2'
            }`}
          >
            {/* Reaction Picker Button */}
            <div className="relative">
              <button
                onClick={() => setReactionBarOpen(!reactionBarOpen)}
                className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {reactionBarOpen && (
                <div className="absolute bottom-full mb-2 -left-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xl rounded-full px-2 py-1 flex items-center space-x-1.5 animate-slide-up z-30">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        reactToMessage(message._id, emoji);
                        setReactionBarOpen(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            <button
              onClick={handleReply}
              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* More Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                title="More actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute bottom-full mb-2 right-0 w-44 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl py-1 z-30 text-xs font-medium animate-slide-up text-slate-700 dark:text-slate-200">
                  {message.text && (
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy text</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (onForward) onForward(message);
                    }}
                    className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
                  >
                    <Forward className="w-3.5 h-3.5 text-slate-400" />
                    <span>Forward</span>
                  </button>

                  {/* OWN MESSAGE ACTIONS ONLY (Requirement 10) */}
                  {isOwn ? (
                    <>
                      {message.text && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setIsEditing(true);
                          }}
                          className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit message</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-dark-border my-1" />

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete message</span>
                      </button>
                    </>
                  ) : (
                    /* OTHER USER'S MESSAGE: NO DELETE OR EDIT, ONLY REPORT (Requirement 10 & 30) */
                    <>
                      <div className="border-t border-slate-100 dark:border-dark-border my-1" />

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setReportModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Report message</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Requirements 11 & 31) */}
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

      {/* Mobile Action Bottom Sheet */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={() => setMobileSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet */}
          <div className="relative z-10 w-full bg-white dark:bg-dark-card rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl border-t border-slate-200 dark:border-dark-border animate-slide-up">
            {/* Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-dark-border mx-auto mb-3.5" />

            {/* Quick Reactions */}
            <div className="flex items-center justify-around py-2.5 px-2 bg-slate-100 dark:bg-dark-hover rounded-2xl mb-3.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    reactToMessage(message._id, emoji);
                    setMobileSheetOpen(false);
                  }}
                  className="text-2xl p-1.5 hover:scale-125 active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action Items List */}
            <div className="space-y-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              <button
                onClick={() => {
                  handleReply();
                  setMobileSheetOpen(false);
                }}
                className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Reply className="w-5 h-5 text-slate-500" />
                <span>Reply</span>
              </button>

              {message.text && (
                <button
                  onClick={() => {
                    handleCopy();
                    setMobileSheetOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                >
                  <Copy className="w-5 h-5 text-slate-500" />
                  <span>Copy Text</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMobileSheetOpen(false);
                  if (onForward) onForward(message);
                }}
                className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Forward className="w-5 h-5 text-slate-500" />
                <span>Forward</span>
              </button>

              {isOwn && message.text && (
                <button
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setIsEditing(true);
                  }}
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-slate-500" />
                  <span>Edit Message</span>
                </button>
              )}

              <div className="border-t border-slate-100 dark:border-dark-border my-1.5" />

              {isOwn ? (
                <button
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <span>Delete Message</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setReportModalOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Report Message</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileSheetOpen(false)}
              className="w-full mt-3 py-3 rounded-2xl bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-300 font-bold text-sm min-h-[44px] flex items-center justify-center transition-colors"
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
