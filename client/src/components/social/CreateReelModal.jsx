import React, { useState, useRef } from 'react';
import { X, Film, Music, Send, Loader2, Upload, Video, RefreshCw } from 'lucide-react';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const CreateReelModal = ({ isOpen, onClose, onReelCreated }) => {
  const { addToast } = useToast();
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Sound');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check video type
    if (!file.type.startsWith('video/')) {
      addToast('Please select a valid video file (MP4, WebM)', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setVideoUrl(res.data.file.url);
        addToast('Video uploaded successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload video', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!videoUrl) {
      addToast('Please select or upload a video for your reel', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/reels', {
        video: videoUrl,
        thumbnail: '',
        caption: caption.trim(),
        audio: { title: audioTitle.trim() || 'Original Sound' },
      });

      if (res.data.success) {
        addToast('Reel published to feed!', 'success');
        if (onReelCreated) onReelCreated(res.data.reel);
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to publish reel', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Create New Reel</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview or Upload Dropzone */}
        {videoUrl ? (
          <div className="relative h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center group shadow-inner">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center space-x-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change</span>
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="h-64 rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-border hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50 dark:bg-dark-surface cursor-pointer flex flex-col items-center justify-center p-6 text-center space-y-3 transition-colors"
          >
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Uploading video...
                </span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Click to select vertical video
                  </p>
                  <p className="text-[11px] text-slate-400">
                    MP4, WebM up to 50MB (9:16 recommended)
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="video/*"
          className="hidden"
        />

        {/* Video URL Alternative Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Or Paste Direct Video URL:
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Caption */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Caption & Hashtags
          </label>
          <input
            type="text"
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
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Original Audio"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={loading || isUploading || !videoUrl}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Share Reel</span>
        </button>
      </div>
    </div>
  );
};

export default CreateReelModal;
