import React, { useState, useRef, useEffect } from 'react';
import {
  Image,
  MapPin,
  Hash,
  Send,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const QUICK_TAGS = ['webdev', 'design', 'ai', 'react', 'fullstack', 'chatflow'];
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PostComposer = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  // Upload state machine: 'IDLE' | 'SELECTED' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  const [uploadStatus, setUploadStatus] = useState('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected file waiting for post creation
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle image selection and client validation
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    // 1. Empty file validation
    if (file.size === 0) {
      setErrorMessage('The selected image file is empty.');
      setUploadStatus('ERROR');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. File extension & MIME validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext) || !file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file format. Please choose a JPG, PNG, WEBP, or GIF image.');
      setUploadStatus('ERROR');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. File size limit validation
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage(`Image is too large (${formatFileSize(file.size)}). Maximum limit is 20MB.`);
      setUploadStatus('ERROR');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke old preview if exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setUploadStatus('SELECTED');
    setUploadProgress(0);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setErrorMessage('');
    setUploadStatus('IDLE');
    setUploadProgress(0);
  };

  const handleAddTag = (tag) => {
    if (!content.includes(`#${tag}`)) {
      setContent((prev) => (prev ? `${prev} #${tag}` : `#${tag}`));
    }
  };

  // Create post flow: Real Upload -> MongoDB Save -> Confirm & Display
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!content.trim() && !selectedFile) {
      return;
    }

    // Prevent duplicate submission
    if (uploadStatus === 'UPLOADING') return;

    try {
      setUploadStatus('UPLOADING');
      setErrorMessage('');
      setUploadProgress(10);

      let mediaList = [];

      // If an image was selected, upload it first to real storage
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entityType', 'post');

        const uploadRes = await api.post('/upload/post-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 80) / progressEvent.total);
              setUploadProgress(Math.min(90, Math.max(15, percent)));
            }
          },
        });

        if (!uploadRes.data.success || !uploadRes.data.file?.url) {
          throw new Error(uploadRes.data.message || 'Image upload failed. Server did not return a valid URL.');
        }

        mediaList.push({
          url: uploadRes.data.file.url,
          publicId: uploadRes.data.file.publicId || '',
          fileType: 'image',
        });
      }

      setUploadProgress(95);

      // Now create the Post in MongoDB with permanent URL
      const postRes = await api.post('/posts', {
        content: content.trim(),
        media: mediaList,
        location: location.trim(),
      });

      if (!postRes.data.success) {
        throw new Error(postRes.data.message || 'Failed to save post in database.');
      }

      setUploadProgress(100);
      setUploadStatus('SUCCESS');
      addToast('Post published successfully!', 'success');

      // Clean up and reset composer
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setContent('');
      setSelectedFile(null);
      setPreviewUrl('');
      setLocation('');
      setShowLocationInput(false);
      setUploadStatus('IDLE');

      if (onPostCreated) {
        onPostCreated(postRes.data.post);
      }
    } catch (err) {
      console.error('Post creation error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Image upload failed. Please try again.';
      setErrorMessage(msg);
      setUploadStatus('ERROR');
      addToast(msg, 'error');
    }
  };

  const isUploading = uploadStatus === 'UPLOADING';

  return (
    <div className="bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs select-none space-y-3">
      {/* Error State Banner with Retry Option */}
      {uploadStatus === 'ERROR' && errorMessage && (
        <div className="flex items-center justify-between p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-400 animate-slide-up">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {selectedFile && (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] transition-colors shadow-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Uploading Progress Bar */}
      {isUploading && (
        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
            <span className="flex items-center space-x-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading image to media storage...</span>
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
            disabled={isUploading}
            placeholder={`What's on your mind, ${user?.fullName?.split(' ')[0] || 'friend'}?`}
            rows={2}
            className="w-full bg-slate-50 dark:bg-dark-card border border-transparent focus:border-brand-500 rounded-2xl p-3 text-xs focus:outline-none text-slate-900 dark:text-white resize-none disabled:opacity-60"
          />

          {/* Location input field if toggled */}
          {showLocationInput && (
            <div className="relative mt-2">
              <MapPin className="w-3.5 h-3.5 text-brand-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled={isUploading}
                placeholder="Add location (e.g. San Francisco, CA)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Selected image preview with metadata */}
          {previewUrl && (
            <div className="mt-3 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-border bg-slate-950 flex flex-col items-center">
              <div className="relative w-full max-h-72 overflow-hidden flex items-center justify-center bg-black">
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="max-h-72 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors disabled:opacity-50"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedFile && (
                <div className="w-full px-3 py-1.5 bg-slate-900/90 text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800">
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-slate-400 font-mono">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}
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
            disabled={isUploading}
            onClick={() => handleAddTag(tag)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-dark-hover hover:bg-brand-500/10 hover:text-brand-500 text-slate-600 dark:text-dark-muted transition-colors flex-shrink-0 disabled:opacity-50"
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-border pl-12">
        <div className="flex items-center space-x-2">
          {/* Add Photo Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
          >
            <Image className="w-4 h-4 text-emerald-500" />
            <span>{selectedFile ? 'Change Photo' : 'Photo'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />

          {/* Location Toggle */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setShowLocationInput(!showLocationInput)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Location</span>
          </button>
        </div>

        {/* Publish Button */}
        <button
          onClick={handleSubmit}
          disabled={isUploading || (!content.trim() && !selectedFile)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm shadow-brand-500/25 transition-all disabled:opacity-40"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Posting...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Post</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PostComposer;
