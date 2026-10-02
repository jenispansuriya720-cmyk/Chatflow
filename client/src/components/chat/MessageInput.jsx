import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  Camera,
  FileText,
  Video as VideoIcon,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import VoiceRecorder from './VoiceRecorder';
import api from '../../services/api';

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😂', '🥹', '😍', '😎', '🥳', '🤔', '🙌', '🔥', '✨', '🚀', '💯'],
  Gestures: ['👍', '👎', '👏', '🤝', '✌️', '💪', '🙏', '❤️', '💖', '🎉', '🌟', '👀'],
  Objects: ['💻', '📱', '☕', '🍕', '🍻', '⚡', '💡', '🎨', '🎯', '🎸', '🎮', '🏖️'],
};

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  
  // Pending files before upload: [{ file, previewUrl, name, size, type, isImage }]
  const [pendingFiles, setPendingFiles] = useState([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
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

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => {
        if (p.previewUrl && p.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
    };
  }, [pendingFiles]);

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

  // Select file handler with strict validation and local preview (pre-send)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setShowAttachMenu(false);

    // 1. Empty file validation
    if (file.size === 0) {
      setUploadError('The selected file is empty.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/');
    const ext = file.name.split('.').pop()?.toLowerCase();

    // 2. Validate image format if selecting an image
    if (isImage) {
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        setUploadError('Unsupported image format. Allowed: JPG, PNG, WEBP, GIF.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError(`Image is too large (${formatFileSize(file.size)}). Limit is 20MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }
    } else {
      // General media limit: 50MB
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size exceeds 50MB limit.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }
    }

    // Generate local preview URL
    const previewUrl = isImage ? URL.createObjectURL(file) : '';

    setPendingFiles((prev) => [
      ...prev,
      {
        file,
        previewUrl,
        name: file.originalname || file.name,
        size: file.size,
        mimeType: file.type,
        isImage,
      },
    ]);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Send message flow: Upload pending file(s) to real storage -> Create message in DB -> Socket delivery
  const handleSend = async () => {
    if ((!text.trim() && pendingFiles.length === 0) || isUploading) return;

    try {
      setIsUploading(true);
      setUploadError('');
      setUploadProgress(10);

      const uploadedAttachments = [];
      let primaryImageUrl = '';

      // Upload any pending files to real media storage first
      for (let i = 0; i < pendingFiles.length; i++) {
        const item = pendingFiles[i];
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('entityType', 'chat');

        const uploadEndpoint = item.isImage ? '/upload/chat-image' : '/upload';

        const res = await api.post(uploadEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const currentStep = (i / pendingFiles.length) * 80;
              const stepProgress = ((progressEvent.loaded / progressEvent.total) * 80) / pendingFiles.length;
              setUploadProgress(Math.min(85, Math.round(currentStep + stepProgress)));
            }
          },
        });

        if (!res.data.success || !res.data.file?.url) {
          throw new Error('Image upload failed. Could not verify storage URL.');
        }

        const uploaded = res.data.file;
        uploadedAttachments.push({
          fileType: uploaded.fileType || (item.isImage ? 'image' : 'document'),
          url: uploaded.url,
          publicId: uploaded.publicId || '',
          name: uploaded.name || item.name,
          size: uploaded.size || item.size,
          mimeType: uploaded.mimeType || item.mimeType,
        });

        if (item.isImage && !primaryImageUrl) {
          primaryImageUrl = uploaded.url;
        }
      }

      setUploadProgress(90);

      // Determine message type
      const hasImage = uploadedAttachments.some((a) => a.fileType === 'image') || Boolean(primaryImageUrl);
      const messageType = hasImage ? 'image' : uploadedAttachments.length > 0 ? 'media' : 'text';

      // Send to server & Socket.IO (never emit fake message before upload confirmed)
      await sendMessage({
        text: text.trim(),
        attachments: uploadedAttachments,
        type: messageType,
        imageUrl: primaryImageUrl,
      });

      // Cleanup on success
      pendingFiles.forEach((p) => {
        if (p.previewUrl && p.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
      setPendingFiles([]);
      setText('');
      setUploadProgress(100);
      sendTypingStatus(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Image upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
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

  if (!activeConversation) return null;

  return (
    <div
      className="relative px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none border-t transition-colors"
      style={{
        backgroundColor: 'var(--chat-header, #ffffff)',
        borderColor: 'var(--chat-border, #e2e8f0)',
      }}
    >
      {/* Floating Theme-Aware Typing Indicator */}
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
          {/* Upload Error Banner with Retry (Requirement 13) */}
          {uploadError && (
            <div className="flex items-center justify-between px-3 py-2 mb-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-400 animate-slide-up">
              <div className="flex items-center space-x-2 flex-1 pr-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  onClick={() => setUploadError('')}
                  className="p-1 hover:text-rose-800 dark:hover:text-rose-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress Banner */}
          {isUploading && (
            <div className="px-3 py-2 mb-2 bg-brand-500/10 border border-brand-500/20 rounded-2xl space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading image to server...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-dark-border rounded-full h-1 overflow-hidden">
                <div
                  className="bg-brand-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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

          {/* PRE-SEND IMAGE & ATTACHMENT PREVIEWS (Requirement 7) */}
          {pendingFiles.length > 0 && (
            <div className="flex items-center space-x-2 mb-2 overflow-x-auto pb-1">
              {pendingFiles.map((item, idx) => (
                <div
                  key={idx}
                  className="relative group flex items-center space-x-2.5 p-1.5 pr-3 bg-slate-100 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border text-xs max-w-[240px] shadow-xs flex-shrink-0 animate-scale-in"
                >
                  {item.isImage ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-slate-300 dark:border-dark-border">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-white text-xs">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(item.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removePendingFile(idx)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors disabled:opacity-40"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
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
                type="button"
                disabled={isUploading}
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-dark-muted dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
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

              <input
                type="file"
                ref={cameraInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-2 w-48 space-y-1 animate-slide-up z-30 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (cameraInputRef.current) {
                        cameraInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/jpeg,image/png,image/webp,image/gif';
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Photo Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime';
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <VideoIcon className="w-4 h-4 text-blue-500" />
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
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
                type="button"
                disabled={isUploading}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-amber-500 dark:text-dark-muted dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
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
                            type="button"
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
                disabled={isUploading}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingFiles.length > 0
                    ? 'Add a caption for your image...'
                    : 'Type a message...'
                }
                rows={1}
                style={{
                  backgroundColor: 'var(--chat-input, #f1f5f9)',
                  color: 'var(--chat-input-text, #0f172a)',
                  borderColor: 'var(--chat-border, transparent)',
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 dark:placeholder-dark-muted resize-none max-h-28 transition-all disabled:opacity-60"
              />
            </div>

            {/* Send / Mic button */}
            {text.trim() || pendingFiles.length > 0 ? (
              <button
                type="button"
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
                type="button"
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
