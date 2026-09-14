import React, { useState, useRef } from 'react';
import { X, Image, Sparkles, Send, Loader2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const SAMPLE_STORY_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
];

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }) => {
  const { addToast } = useToast();
  const [mediaUrl, setMediaUrl] = useState(SAMPLE_STORY_BACKGROUNDS[0]);
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setMediaUrl(res.data.file.url);
      }
    } catch (err) {
      addToast('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!mediaUrl && !text.trim()) {
      addToast('Please provide an image or text for your story', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/stories', {
        media: mediaUrl,
        mediaType: 'image',
        text: text.trim(),
      });

      if (res.data.success) {
        addToast('Story published for 24 hours!', 'success');
        if (onStoryCreated) onStoryCreated(res.data.story);
        onClose();
      }
    } catch (err) {
      addToast('Failed to publish story', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Create 24h Story
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Preview Container */}
        <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
          <img
            src={mediaUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {text && (
            <div className="absolute bottom-4 left-3 right-3 p-2 bg-black/60 backdrop-blur-xs rounded-xl text-white text-xs text-center font-semibold">
              {text}
            </div>
          )}
        </div>

        {/* Change Background / Upload Photo */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Choose Background:
          </span>
          <div className="flex items-center space-x-2">
            {SAMPLE_STORY_BACKGROUNDS.map((bg, idx) => (
              <img
                key={idx}
                src={bg}
                alt={`Sample ${idx}`}
                onClick={() => setMediaUrl(bg)}
                className={`w-10 h-10 rounded-xl object-cover cursor-pointer transition-all ${
                  mediaUrl === bg ? 'ring-2 ring-brand-500 scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl border border-dashed border-slate-300 dark:border-dark-border flex items-center justify-center text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-colors"
              title="Upload your own photo"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Story Text Overlay */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Caption / Text Overlay (Optional)
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add text or emojis..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={loading || isUploading}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Share to Your Story</span>
        </button>
      </div>
    </div>
  );
};

export default CreateStoryModal;
