import React, { useState, useRef } from 'react';
import { X, Film, Music, Send, Loader2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const SAMPLE_REEL_VIDEOS = [
  {
    title: 'Futuristic Tech Animation',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-animation-of-futuristic-technological-connections-41551-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Ocean Beach Waves',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-waves-coming-to-the-beach-41484-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Software Developer Typing',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-40994-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
  },
];

const CreateReelModal = ({ isOpen, onClose, onReelCreated }) => {
  const { addToast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState(SAMPLE_REEL_VIDEOS[0]);
  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Sound');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setSelectedVideo({
          title: 'Custom Upload',
          url: res.data.file.url,
          thumbnail: '',
        });
      }
    } catch (err) {
      addToast('Failed to upload video', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!selectedVideo?.url) {
      addToast('Please select or upload a vertical video', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/reels', {
        video: selectedVideo.url,
        thumbnail: selectedVideo.thumbnail || '',
        caption: caption.trim(),
        audio: { title: audioTitle.trim() || 'Original Sound' },
      });

      if (res.data.success) {
        addToast('Reel published to feed!', 'success');
        if (onReelCreated) onReelCreated(res.data.reel);
        onClose();
      }
    } catch (err) {
      addToast('Failed to publish reel', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Upload Reel
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="h-60 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
          <video
            src={selectedVideo.url}
            controls
            className="w-full h-full object-cover"
          />
        </div>

        {/* Select Sample Video / Upload */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Select Video Track:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_REEL_VIDEOS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedVideo(item)}
                className={`p-2 rounded-xl text-[10px] font-semibold border truncate transition-all ${
                  selectedVideo.url === item.url
                    ? 'bg-brand-500/10 border-brand-500 text-brand-600'
                    : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-1.5 border border-dashed border-slate-300 dark:border-dark-border rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-500 hover:border-brand-500 transition-colors mt-1"
          >
            {isUploading ? 'Uploading...' : 'Or Upload MP4 Video'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden"
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
            placeholder="Add caption (e.g. Awesome project #coding #tech)..."
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
          disabled={loading || isUploading}
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
