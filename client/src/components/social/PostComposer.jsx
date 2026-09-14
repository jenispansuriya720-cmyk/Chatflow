import React, { useState, useRef } from 'react';
import { Image, MapPin, Hash, Send, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const QUICK_TAGS = ['webdev', 'design', 'ai', 'react', 'fullstack', 'chatflow'];

const PostComposer = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [content, setContent] = useState('');
  const [mediaList, setMediaList] = useState([]);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

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
        setMediaList((prev) => [
          ...prev,
          { url: res.data.file.url, fileType: 'image' },
        ]);
      }
    } catch (err) {
      addToast('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddTag = (tag) => {
    if (!content.includes(`#${tag}`)) {
      setContent((prev) => (prev ? `${prev} #${tag}` : `#${tag}`));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaList.length === 0) return;

    try {
      setLoading(true);
      const res = await api.post('/posts', {
        content: content.trim(),
        media: mediaList,
        location: location.trim(),
      });

      if (res.data.success) {
        addToast('Post published successfully!', 'success');
        setContent('');
        setMediaList([]);
        setLocation('');
        setShowLocationInput(false);
        if (onPostCreated) onPostCreated(res.data.post);
      }
    } catch (err) {
      addToast('Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs select-none space-y-3">
      <div className="flex items-start space-x-3">
        <Avatar
          src={user?.profilePicture}
          name={user?.fullName}
          size="md"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user?.fullName?.split(' ')[0] || 'friend'}?`}
            rows={2}
            className="w-full bg-slate-50 dark:bg-dark-card border border-transparent focus:border-brand-500 rounded-2xl p-3 text-xs focus:outline-none text-slate-900 dark:text-white resize-none"
          />

          {/* Location input field if toggled */}
          {showLocationInput && (
            <div className="relative mt-2">
              <MapPin className="w-3.5 h-3.5 text-brand-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Add location (e.g. San Francisco, CA)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Pending media previews */}
          {mediaList.length > 0 && (
            <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-1">
              {mediaList.map((m, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 group">
                  <img src={m.url} alt="Media" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setMediaList((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Hashtags */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pl-12">
        <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-0.5 flex-shrink-0">
          <Hash className="w-3 h-3" />
          <span>Tags:</span>
        </span>
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleAddTag(tag)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-dark-hover hover:bg-brand-500/10 hover:text-brand-500 text-slate-600 dark:text-dark-muted transition-colors flex-shrink-0"
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-border pl-12">
        <div className="flex items-center space-x-2">
          {/* Add Photo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
            ) : (
              <Image className="w-4 h-4 text-emerald-500" />
            )}
            <span>Photo</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Location Toggle */}
          <button
            type="button"
            onClick={() => setShowLocationInput(!showLocationInput)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Location</span>
          </button>
        </div>

        {/* Publish Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || (!content.trim() && mediaList.length === 0)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm shadow-brand-500/25 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Post</span>
        </button>
      </div>
    </div>
  );
};

export default PostComposer;
