import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Loader2,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import VoiceRecorder from './VoiceRecorder';
import api from '../../services/api';

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😂', '🥹', '😍', '😎', '🥳', '🤔', '🙌', '🔥', '✨', '🚀', '💯'],
  Gestures: ['👍', '👎', '👏', '🤝', '✌️', '💪', '🙏', '❤️', '💖', '🎉', '🌟', '👀'],
  Objects: ['💻', '📱', '☕', '🍕', '🍻', '⚡', '💡', '🎨', '🎯', '🎸', '🎮', '🏖️'],
};

const MessageInput = () => {
  const {
    activeConversation,
    sendMessage,
    replyingTo,
    setReplyingTo,
    sendTypingStatus,
    typingUsers,
  } = useChat();

  const typingList = typingUsers[activeConversation?._id] || [];

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Handle typing debounce
  const handleTextChange = (e) => {
    setText(e.target.value);

    // Typing notification
    sendTypingStatus(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload file
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setShowAttachMenu(false);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setAttachments((prev) => [...prev, res.data.file]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0) || isUploading) return;

    try {
      await sendMessage({
        text: text.trim(),
        attachments,
      });

      setText('');
      setAttachments([]);
      sendTypingStatus(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  // Send voice note
  const handleSendVoice = async (voicePayload) => {
    try {
      const voiceAttachments = voicePayload.voiceUrl
        ? [
            {
              fileType: 'audio',
              url: voicePayload.voiceUrl,
              name: 'Voice Note',
              size: 50000,
              mimeType: 'audio/webm',
            },
          ]
        : [];

      await sendMessage({
        text: '',
        attachments: voiceAttachments,
        voiceData: {
          duration: voicePayload.duration,
          waveform: voicePayload.waveform,
        },
      });

      setIsRecordingVoice(false);
    } catch (err) {
      console.error('Failed to send voice note:', err);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (!activeConversation) return null;

  return (
    <div
      className="relative px-4 py-3 select-none border-t transition-colors"
      style={{
        backgroundColor: 'var(--chat-header, #ffffff)',
        borderColor: 'var(--chat-border, #e2e8f0)',
      }}
    >
      {/* Floating Theme-Aware Typing Indicator (Requirement 33) */}
      {typingList.length > 0 && (
        <div className="absolute -top-7 left-4 flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-white/90 dark:bg-dark-card/90 backdrop-blur-xs border border-slate-200 dark:border-dark-border shadow-xs text-[11px] text-slate-500 animate-slide-up z-20">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {typingList.join(', ')} {typingList.length > 1 ? 'are' : 'is'} typing
          </span>
          <span className="inline-flex space-x-1 ml-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: 'var(--chat-accent, #4f46e5)' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]"
              style={{ backgroundColor: 'var(--chat-accent, #4f46e5)' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]"
              style={{ backgroundColor: 'var(--chat-accent, #4f46e5)' }}
            />
          </span>
        </div>
      )}
      {/* Voice Recorder Overlay */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <>
          {/* Replying Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-100 dark:bg-dark-hover rounded-xl text-xs border-l-4 border-brand-500 animate-slide-up">
              <div className="truncate pr-2">
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  Replying to {replyingTo.sender?.fullName || 'User'}
                </span>
                <p className="text-slate-500 dark:text-dark-muted truncate">
                  {replyingTo.text || 'Media attachment'}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex items-center space-x-2 mb-2 overflow-x-auto pb-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="relative flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-dark-hover rounded-xl border border-slate-200 dark:border-dark-border text-xs max-w-[200px]"
                >
                  {att.fileType === 'image' ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <FileText className="w-5 h-5 text-brand-500" />
                  )}
                  <span className="truncate flex-1 font-medium">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Controls Bar */}
          <div className="flex items-center space-x-2">
            {/* Attachment Button & Menu */}
            <div className="relative" ref={attachMenuRef}>
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 text-slate-500 hover:text-brand-600 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-2 w-44 space-y-1 animate-slide-up z-30 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <button
                    onClick={() => {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current.accept = 'video/*';
                      fileInputRef.current.click();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <VideoIcon className="w-4 h-4 text-blue-500" />
                    <span>Video</span>
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
                      fileInputRef.current.click();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span>Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Emoji Picker Button & Popover */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-500 hover:text-amber-500 dark:text-dark-muted dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                title="Insert emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-3 z-30 animate-slide-up">
                  {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                    <div key={cat} className="mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {cat}
                      </span>
                      <div className="grid grid-cols-6 gap-1">
                        {emojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setText((prev) => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-hover"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                style={{
                  backgroundColor: 'var(--chat-input, #f1f5f9)',
                  color: 'var(--chat-input-text, #0f172a)',
                  borderColor: 'var(--chat-border, transparent)',
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 dark:placeholder-dark-muted resize-none max-h-28 transition-all"
              />
            </div>

            {/* Mic / Send button */}
            {text.trim() || attachments.length > 0 ? (
              <button
                onClick={handleSend}
                disabled={isUploading}
                style={{
                  background: 'var(--chat-accent, #4f46e5)',
                }}
                className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                title="Send Message"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-dark-hover hover:bg-brand-500/15 text-slate-500 dark:text-dark-muted hover:text-brand-500 flex items-center justify-center transition-all active:scale-95"
                title="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MessageInput;
