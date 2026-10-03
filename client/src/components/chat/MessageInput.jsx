import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Plus,
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
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
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

  // Reply metadata computation (Sections 2, 3, 4, 14, 15)
  const replySenderName = (() => {
    if (!replyingTo) return '';
    const sender = replyingTo.sender;
    const senderId = sender?._id || replyingTo.senderId || sender;
    if (user?._id && senderId?.toString() === user._id.toString()) {
      return user.fullName || user.username || 'yourself';
    }
    return sender?.fullName || sender?.username || 'User';
  })();

  const replyImage =
    replyingTo?.imageUrl ||
    replyingTo?.attachments?.find((a) => a.fileType === 'image')?.url ||
    (replyingTo?.type === 'image' && replyingTo?.mediaUrl) ||
    '';

  const replyIsVideo =
    replyingTo?.type === 'video' ||
    replyingTo?.attachments?.some((a) => a.fileType === 'video');

  const replyPreviewText = (() => {
    if (!replyingTo) return '';
    if (replyingTo.isDeleted) return 'Original message was deleted';
    if (replyingTo.text) return replyingTo.text;
    if (replyImage) return 'Photo';
    if (replyIsVideo) return 'Video';
    if (replyingTo.voiceData?.duration) return 'Voice note';
    if (replyingTo.sharedContent) return `Shared ${replyingTo.sharedContent.contentType || 'content'}`;
    if (replyingTo.attachments?.length) return replyingTo.attachments[0].name || 'Attachment';
    return 'Attachment';
  })();
  
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
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  const clearFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  // Toggle plus / attachment menu
  const handlePlusMenu = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setShowAttachMenu((prev) => !prev);
  };

  // Close menus or cancel reply when clicking outside or pressing Escape (Requirements 5, 8)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAttachMenu(false);
        setShowEmojiPicker(false);
        if (replyingTo) {
          setReplyingTo(null);
        }
      }
    };

    const handleOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [replyingTo, setReplyingTo]);

  // Auto-focus composer input when replying starts
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

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

  // Keyboard navigation inside composer
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      setReplyingTo(null);
      return;
    }
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
      clearFileInputs();
      return;
    }

    const isImage = file.type.startsWith('image/');
    const ext = file.name.split('.').pop()?.toLowerCase();

    // 2. Validate image format if selecting an image
    if (isImage) {
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        setUploadError('Unsupported image format. Allowed: JPG, PNG, WEBP, GIF.');
        clearFileInputs();
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError(`Image is too large (${formatFileSize(file.size)}). Limit is 20MB.`);
        clearFileInputs();
        return;
      }
    } else {
      // General media limit: 50MB
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size exceeds 50MB limit.');
        clearFileInputs();
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

    clearFileInputs();
  };

  // Dedicated image select handler for Photo & Camera options (Requirement 4)
  const handleImageSelect = (e) => {
    handleFileSelect(e);
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
    clearFileInputs();
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

          {/* Professional Connected Reply Attachment (Sections 2, 3, 4, 5, 14, 15, 16) */}
          {replyingTo && (
            <div
              className="flex items-center justify-between px-3.5 py-2.5 mb-2.5 rounded-2xl border transition-all animate-slide-up select-none shadow-xs"
              style={{
                backgroundColor: 'var(--chat-input, rgba(241, 245, 249, 0.7))',
                borderColor: 'var(--chat-border, rgba(226, 232, 240, 0.8))',
                borderLeftWidth: '4px',
                borderLeftColor: 'var(--chat-accent, #4f46e5)',
              }}
            >
              <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
                {/* Image thumbnail if replying to an image */}
                {replyImage && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200 dark:border-dark-border shadow-xs">
                    <img
                      src={replyImage}
                      alt="Replied media"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Video icon if replying to a video */}
                {replyIsVideo && !replyImage && (
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 text-base">
                    🎥
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold truncate flex items-center space-x-1"
                    style={{ color: 'var(--chat-accent, #4f46e5)' }}
                  >
                    <span>Replying to {replySenderName}.</span>
                  </div>
                  <p className="text-[12px] text-slate-600 dark:text-dark-muted truncate line-clamp-2 mt-0.5 leading-snug">
                    {replyPreviewText}
                  </p>
                </div>
              </div>

              {/* Close Reply Mode (Requirement 5) */}
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-dark-hover transition-colors flex-shrink-0 touch-manipulation cursor-pointer"
                title="Cancel reply (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PRE-SEND IMAGE & ATTACHMENT PREVIEWS (Requirement 11) */}
          {pendingFiles.length > 0 && (
            <div className="flex items-center space-x-3 mb-2.5 overflow-x-auto pb-1.5 pt-0.5">
              {pendingFiles.map((item, idx) => (
                <div
                  key={idx}
                  className="relative group flex items-center space-x-3 p-2 pr-3.5 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border text-xs max-w-[280px] shadow-sm flex-shrink-0 animate-scale-in"
                >
                  {item.isImage ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200 dark:border-dark-border shadow-xs">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : item.mimeType?.startsWith('video/') ? (
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                      <VideoIcon className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-white text-xs">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {formatFileSize(item.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removePendingFile(idx)}
                    aria-label="Remove attachment"
                    className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors disabled:opacity-40"
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
            {/* Attachment Plus Button & Action Menu (Requirements 1, 2, 8, 9) */}
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={handlePlusMenu}
                disabled={isUploading}
                aria-label="Open attachment menu"
                aria-expanded={showAttachMenu}
                aria-haspopup="true"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-dark-muted dark:hover:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-all duration-150 disabled:opacity-50 select-none cursor-pointer touch-manipulation z-20"
                title="Open attachment menu"
              >
                <Plus
                  className={`w-5 h-5 transition-transform duration-200 ${
                    showAttachMenu ? 'rotate-45 text-brand-600 dark:text-brand-400' : ''
                  }`}
                />
              </button>

              {/* Real hidden file inputs (Requirement 4) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageSelect}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleImageSelect}
              />

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={handleFileSelect}
              />

              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,*/*"
                hidden
                onChange={handleFileSelect}
              />

              {showAttachMenu && (
                <div
                  role="menu"
                  aria-label="Attachment options"
                  className="absolute bottom-full mb-3 left-0 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-2xl p-2 w-52 space-y-1 animate-slide-up z-50 text-xs font-medium text-slate-700 dark:text-slate-200 backdrop-blur-md"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">Photo</div>
                      <div className="text-[10px] text-slate-400">Pictures & gallery</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">Camera</div>
                      <div className="text-[10px] text-slate-400">Capture photo directly</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      videoInputRef.current?.click();
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">Video</div>
                      <div className="text-[10px] text-slate-400">Upload video clips</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">File</div>
                      <div className="text-[10px] text-slate-400">Documents & files</div>
                    </div>
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
