import React, { useState, useEffect, useMemo } from 'react';

/**
 * ChatFlow Unified Canonical Avatar Component
 * 
 * Enforces strict 1:1 aspect ratio, centered object-fit cropping,
 * flex-shrink protection, responsive presets, high-contrast fallback initials,
 * and scaled status badges.
 */
const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  status = null,
  isOnline = false,
  showStatus = false,
  storyRing = false,
  hasUnviewedStory = false,
  liveBadge = false,
  priority = false,
  className = '',
  alt,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  // Derive initials: "Sarah Connor" -> "SC", "John" -> "J"
  const initials = useMemo(() => {
    if (!name || typeof name !== 'string') return 'U';
    const clean = name.trim();
    if (!clean) return 'U';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }, [name]);

  // Standardized size tokens
  const sizeMap = {
    xs: {
      container: 'w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px]',
      text: 'text-[10px]',
      status: 'w-2 h-2 border-[1.5px]',
    },
    sm: {
      container: 'w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px]',
      text: 'text-xs',
      status: 'w-2.5 h-2.5 border-[2px]',
    },
    md: {
      container: 'w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px]',
      text: 'text-sm font-semibold',
      status: 'w-3 h-3 border-[2px]',
    },
    lg: {
      container: 'w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px]',
      text: 'text-base font-semibold',
      status: 'w-3.5 h-3.5 border-[2px]',
    },
    xl: {
      container: 'w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px]',
      text: 'text-xl font-bold',
      status: 'w-4 h-4 border-[2.5px]',
    },
    '2xl': {
      container: 'w-24 h-24 min-w-[96px] min-h-[96px] max-w-[96px] max-h-[96px]',
      text: 'text-3xl font-extrabold',
      status: 'w-5 h-5 border-[3px]',
    },
    call: {
      container: 'call-avatar',
      text: 'text-5xl sm:text-6xl font-extrabold',
      status: 'w-7 h-7 border-[4px]',
    },
    profile: {
      container: 'profile-avatar',
      text: 'text-4xl sm:text-5xl font-extrabold',
      status: 'w-6 h-6 border-[3px]',
    },
    story: {
      container: 'w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px]',
      text: 'text-lg font-bold',
      status: 'w-3.5 h-3.5 border-[2px]',
    },
    live: {
      container: 'w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px]',
      text: 'text-base font-bold',
      status: 'w-3.5 h-3.5 border-[2px]',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Normalized presence status: supports 'online', 'away', 'offline' or boolean
  const effectiveStatus = useMemo(() => {
    if (status !== null && status !== undefined) {
      if (typeof status === 'boolean') return status ? 'online' : 'offline';
      return status;
    }
    if (showStatus) {
      return isOnline ? 'online' : 'offline';
    }
    return null;
  }, [status, isOnline, showStatus]);

  // Optimize Cloudinary URLs with face detection if applicable
  const optimizedSrc = useMemo(() => {
    if (!src || typeof src !== 'string') return null;
    if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
      const dimension = size === 'call' ? 320 : size === 'profile' ? 240 : size === '2xl' ? 192 : 96;
      return src.replace('/upload/', `/upload/c_fill,g_face,w_${dimension},h_${dimension},q_auto,f_auto/`);
    }
    return src;
  }, [src, size]);

  // Main inner circular avatar element
  const renderAvatarCircle = () => {
    const hasImage = Boolean(optimizedSrc && !imageError);

    return (
      <div
        className={`avatar ${currentSize.container} bg-slate-100 dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10`}
      >
        {hasImage ? (
          <img
            src={optimizedSrc}
            alt={alt || name || 'Profile picture'}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center block"
          />
        ) : (
          <div
            className={`avatar-fallback ${currentSize.text} bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white shadow-inner`}
            aria-label={name}
          >
            {initials}
          </div>
        )}
      </div>
    );
  };

  // Status Indicator
  const renderStatusBadge = () => {
    if (!effectiveStatus) return null;

    const bgClass =
      effectiveStatus === 'online'
        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
        : effectiveStatus === 'away'
        ? 'bg-amber-500'
        : 'bg-slate-400';

    return (
      <span
        className={`avatar-status ${currentSize.status} ${bgClass}`}
        title={`Status: ${effectiveStatus}`}
      />
    );
  };

  // Story Tray Wrapper (Outer Ring Separation)
  if (size === 'story' || storyRing) {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col items-center flex-shrink-0 select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div
          className={`p-[2.5px] rounded-full transition-transform hover:scale-105 ${
            hasUnviewedStory
              ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20'
              : 'bg-slate-300 dark:bg-dark-border'
          }`}
        >
          <div className="p-0.5 rounded-full bg-white dark:bg-dark-surface">
            {renderAvatarCircle()}
          </div>
        </div>
        {renderStatusBadge()}
      </div>
    );
  }

  // Live Stream Wrapper with independent LIVE badge
  if (size === 'live' || liveBadge) {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col items-center flex-shrink-0 select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-red-500 to-rose-600 shadow-md shadow-red-500/30">
          <div className="p-0.5 rounded-full bg-white dark:bg-dark-surface">
            {renderAvatarCircle()}
          </div>
        </div>
        <span className="absolute -bottom-1.5 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-extrabold tracking-wider rounded-full shadow-sm animate-pulse flex items-center space-x-0.5">
          <span className="w-1 h-1 rounded-full bg-white" />
          <span>LIVE</span>
        </span>
      </div>
    );
  }

  // Standard Avatar container
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {renderAvatarCircle()}
      {renderStatusBadge()}
    </div>
  );
};

export default Avatar;
export { Avatar };
