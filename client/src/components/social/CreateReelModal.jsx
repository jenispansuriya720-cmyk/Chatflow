import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Film,
  Music,
  Send,
  Loader2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const CreateReelModal = ({ isOpen, onClose, onReelCreated }) => {
  const { addToast } = useToast();

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [coverStorageUrl, setCoverStorageUrl] = useState('');

  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Sound');

  // State machine: 'IDLE' | 'SELECTED' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  const [status, setStatus] = useState('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [videoPreviewUrl, coverPreviewUrl]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && status !== 'UPLOADING') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  // Handle Video file selection
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (MP4, WebM).');
      setStatus('ERROR');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Video size exceeds 50MB limit.');
      setStatus('ERROR');
      return;
    }

    setErrorMessage('');
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(preview);
    setVideoUrl(''); // clear direct url if file selected
    setStatus('SELECTED');
  };

  // Handle Cover / Thumbnail Image selection & client validation
  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    if (file.size === 0) {
      setErrorMessage('The cover image file is empty.');
      setStatus('ERROR');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext) || !file.type.startsWith('image/')) {
      setErrorMessage('Invalid cover image format. Please select JPG, PNG, WEBP, or GIF.');
      setStatus('ERROR');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Cover image is too large. Maximum size is 10MB.');
      setStatus('ERROR');
      return;
    }

    if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreviewUrl(preview);
    setCoverStorageUrl('');
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleRemoveCover = () => {
    if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverStorageUrl('');
  };

  // Publish Reel: Upload Cover Image + Upload Video -> Create Reel in MongoDB
  const handlePublish = async (e) => {
    if (e) e.preventDefault();

    if (!videoFile && !videoUrl.trim()) {
      setErrorMessage('Please select or upload a video for your reel.');
      setStatus('ERROR');
      return;
    }

    if (status === 'UPLOADING') return;

    try {
      setStatus('UPLOADING');
      setErrorMessage('');
      setUploadProgress(10);

      let finalVideoUrl = videoUrl.trim();
      let videoPublicId = '';
      let finalThumbnailUrl = coverStorageUrl;
      let thumbnailPublicId = '';

      // 1. Upload cover image if selected
      if (coverFile) {
        const coverFormData = new FormData();
        coverFormData.append('file', coverFile);
        coverFormData.append('entityType', 'reel');

        const coverRes = await api.post('/upload/reel-cover', coverFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!coverRes.data.success || !coverRes.data.file?.url) {
          throw new Error('Cover image upload failed.');
        }

        finalThumbnailUrl = coverRes.data.file.url;
        thumbnailPublicId = coverRes.data.file.publicId || '';
        setCoverStorageUrl(finalThumbnailUrl);
      }

      setUploadProgress(40);

      // 2. Upload video file if local file was selected
      if (videoFile) {
        const videoFormData = new FormData();
        videoFormData.append('file', videoFile);
        videoFormData.append('entityType', 'reel');

        const videoRes = await api.post('/upload', videoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = 40 + Math.round((progressEvent.loaded * 45) / progressEvent.total);
              setUploadProgress(Math.min(90, percent));
            }
          },
        });

        if (!videoRes.data.success || !videoRes.data.file?.url) {
          throw new Error(videoRes.data.message || 'Video upload failed.');
        }

        finalVideoUrl = videoRes.data.file.url;
        videoPublicId = videoRes.data.file.publicId || '';
      }

      setUploadProgress(95);

      // 3. Save Reel in MongoDB with real permanent URLs and public IDs
      const res = await api.post('/reels', {
        video: finalVideoUrl,
        videoPublicId,
        thumbnail: finalThumbnailUrl || '',
        thumbnailPublicId,
        caption: caption.trim(),
        audio: { title: audioTitle.trim() || 'Original Sound' },
      });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to publish reel.');
      }

      setUploadProgress(100);
      setStatus('SUCCESS');
      addToast('Reel published to feed with real media!', 'success');

      // Dispatch global real-time event
      window.dispatchEvent(new CustomEvent('chatflow:reel-created', { detail: res.data.reel }));

      if (onReelCreated) onReelCreated(res.data.reel);
      onClose();
    } catch (err) {
      console.error('Reel publish error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to upload reel or cover image. Please try again.';
      setErrorMessage(msg);
      setStatus('ERROR');
      addToast(msg, 'error');
    }
  };

  const isUploading = status === 'UPLOADING';
  const effectiveVideoSrc = videoPreviewUrl || videoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Create New Reel</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error State Banner with Retry */}
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

        {/* Upload Progress Indicator */}
        {isUploading && (
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
              <span className="flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading reel & cover...</span>
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

        {/* Video Preview or Upload Dropzone */}
        {effectiveVideoSrc ? (
          <div className="relative h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center group shadow-inner">
            <video
              src={effectiveVideoSrc}
              controls
              poster={coverPreviewUrl || undefined}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => videoInputRef.current?.click()}
              className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center space-x-1 transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Video</span>
            </button>
          </div>
        ) : (
          <div
            onClick={() => !isUploading && videoInputRef.current?.click()}
            className="h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-border hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50 dark:bg-dark-surface cursor-pointer flex flex-col items-center justify-center p-4 text-center space-y-2 transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                Select vertical video
              </p>
              <p className="text-[10px] text-slate-400">
                MP4, WebM up to 50MB (9:16 recommended)
              </p>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoSelect}
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
        />

        {/* Cover Image / Thumbnail Upload Section (Requirement 4) */}
        <div className="p-3 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Reel Cover / Thumbnail</span>
            </span>
            {coverPreviewUrl && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemoveCover}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
              >
                Remove
              </button>
            )}
          </div>

          {coverPreviewUrl ? (
            <div className="flex items-center space-x-3">
              <img
                src={coverPreviewUrl}
                alt="Cover preview"
                className="w-12 h-16 object-cover rounded-xl border border-slate-300 dark:border-dark-border shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                  {coverFile?.name || 'Cover selected'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {coverFile ? `${Math.round(coverFile.size / 1024)} KB` : 'Uploaded'}
                </p>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-1 text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  Change Cover Image
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => coverInputRef.current?.click()}
              className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-dark-border rounded-xl text-xs text-slate-500 hover:text-brand-600 hover:border-brand-500 transition-colors flex items-center justify-center space-x-1.5 bg-white dark:bg-dark-card"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Choose Cover Image (JPG, PNG, WEBP)</span>
            </button>
          )}

          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
        </div>

        {/* Video URL Alternative Input */}
        {!videoFile && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Or Paste Direct Video URL:
            </label>
            <input
              type="url"
              disabled={isUploading}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Caption */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Caption & Hashtags
          </label>
          <input
            type="text"
            disabled={isUploading}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add caption (e.g. Exploring ChatFlow #creator #tech)..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Audio title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Audio Title
          </label>
          <div className="relative">
            <Music className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              disabled={isUploading}
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Original Audio"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={isUploading || (!videoFile && !videoUrl.trim())}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Reel...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Share Reel</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateReelModal;
