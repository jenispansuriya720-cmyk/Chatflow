import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'webm', 'mov'];

const STORY_GRADIENT_PRESETS = [
  {
    name: 'Sunset Glow',
    gradient: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f59e0b"/><stop offset="50%" stop-color="%23f43f5e"/><stop offset="100%" stop-color="%239333ea"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>',
  },
  {
    name: 'Ocean Breeze',
    gradient: 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="50%" stop-color="%232563eb"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>',
  },
  {
    name: 'Emerald Aurora',
    gradient: 'bg-gradient-to-tr from-emerald-400 via-teal-600 to-slate-900',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2334d399"/><stop offset="50%" stop-color="%230d9488"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>',
  },
  {
    name: 'Midnight Neon',
    gradient: 'bg-gradient-to-tr from-violet-600 via-purple-900 to-black',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237c3aed"/><stop offset="50%" stop-color="%23581c87"/><stop offset="100%" stop-color="%23000000"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>',
  },
];

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }) => {
  const { addToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [previewUrl, setPreviewUrl] = useState(STORY_GRADIENT_PRESETS[0].dataUri);
  const [isPreset, setIsPreset] = useState(true);

  const [text, setText] = useState('');

  // State machine: 'IDLE' | 'SELECTED' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  const [status, setStatus] = useState('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && status !== 'UPLOADING') {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, status]);

  // Clean up object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Handle media file selection & validation
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    if (file.size === 0) {
      setErrorMessage('The selected file is empty.');
      setStatus('ERROR');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isVideo = file.type.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);
    const isImage = file.type.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);

    if (!isImage && !isVideo) {
      setErrorMessage('Unsupported format. Please select an image (JPG, PNG, WEBP, GIF) or video (MP4, WEBM).');
      setStatus('ERROR');
      return;
    }

    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Image size exceeds the 20MB limit.');
      setStatus('ERROR');
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      setErrorMessage('Video size exceeds the 50MB limit.');
      setStatus('ERROR');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(blobUrl);
    setIsPreset(false);
    setStatus('SELECTED');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectPreset = (preset) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setMediaType('image');
    setPreviewUrl(preset.dataUri);
    setIsPreset(true);
    setStatus('SELECTED');
    setErrorMessage('');
  };

  // Publish Story: Upload real media -> Save Story document in MongoDB
  const handlePublish = async (e) => {
    if (e) e.preventDefault();

    if (!selectedFile && !isPreset && !text.trim()) {
      setErrorMessage('Please select an image/video or enter text for your story.');
      setStatus('ERROR');
      return;
    }

    if (status === 'UPLOADING') return;

    try {
      setStatus('UPLOADING');
      setErrorMessage('');
      setUploadProgress(15);

      let finalMediaUrl = previewUrl;
      let finalPublicId = '';
      let resolvedMediaType = mediaType;

      // Upload real media to storage if a file was selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entityType', 'story');

        const uploadEndpoint = mediaType === 'video' ? '/upload' : '/upload/story-image';

        const uploadRes = await api.post(uploadEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 80) / progressEvent.total);
              setUploadProgress(Math.min(90, Math.max(20, percent)));
            }
          },
        });

        if (!uploadRes.data.success || !uploadRes.data.file?.url) {
          throw new Error('Failed to upload story media to storage.');
        }

        finalMediaUrl = uploadRes.data.file.url;
        finalPublicId = uploadRes.data.file.publicId || '';
        resolvedMediaType = uploadRes.data.file.fileType || mediaType;
      }

      setUploadProgress(95);

      // Create story in MongoDB with confirmed storage URL
      const res = await api.post('/stories', {
        media: finalMediaUrl,
        publicId: finalPublicId,
        mediaType: resolvedMediaType,
        text: text.trim(),
      });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to publish story in database.');
      }

      setUploadProgress(100);
      setStatus('SUCCESS');
      addToast('Story published successfully!', 'success');

      // Dispatch real-time global event
      window.dispatchEvent(new CustomEvent('chatflow:story-created', { detail: res.data.story }));

      if (onStoryCreated) {
        onStoryCreated(res.data.story);
      }

      setTimeout(() => {
        handleClose();
      }, 400);
    } catch (err) {
      console.error('Story publish failed:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to publish story. Please try again.';
      setErrorMessage(msg);
      setStatus('ERROR');
      addToast(msg, 'error');
    }
  };

  const isUploading = status === 'UPLOADING';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 select-none animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl max-w-sm w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 animate-sheet-up sm:animate-scale-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Create 24h Story</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner with Retry */}
        {status === 'ERROR' && errorMessage && (
          <div className="flex items-center justify-between p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-400 animate-slide-up">
            <div className="flex items-center space-x-1.5 flex-1 pr-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
              <span className="flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading story image...</span>
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Story Preview Container */}
        <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-inner">
          {mediaType === 'video' ? (
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={previewUrl}
              alt="Story Preview"
              className="w-full h-full object-cover"
            />
          )}
          {text && (
            <div className="absolute bottom-4 left-3 right-3 p-2.5 bg-black/65 backdrop-blur-md rounded-xl text-white text-xs text-center font-semibold drop-shadow-md">
              {text}
            </div>
          )}
          {selectedFile && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white backdrop-blur-xs font-medium">
              {mediaType === 'video' ? 'Video selected' : 'Photo selected'}
            </div>
          )}
        </div>

        {/* Background / Upload Photo Picker */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Choose Background or Upload Media:
          </span>
          <div className="flex items-center space-x-2.5">
            {STORY_GRADIENT_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                title={preset.name}
                onClick={() => !isUploading && handleSelectPreset(preset)}
                className={`w-10 h-10 rounded-xl ${preset.gradient} cursor-pointer transition-all ${
                  isPreset && previewUrl === preset.dataUri
                    ? 'ring-2 ring-brand-500 scale-105'
                    : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className={`w-10 h-10 rounded-xl border border-dashed flex items-center justify-center transition-colors ${
                selectedFile
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                  : 'border-slate-300 dark:border-dark-border text-slate-400 hover:text-brand-500 hover:border-brand-500 bg-slate-50 dark:bg-dark-surface'
              }`}
              title="Upload photo or video"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              className="hidden"
            />
          </div>
        </div>

        {/* Caption Overlay */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Caption / Text Overlay (Optional)
          </label>
          <input
            type="text"
            disabled={isUploading}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add text or emojis..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={isUploading}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Story...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Share to Your Story</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateStoryModal;
