import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  Volume2,
  VolumeX,
  Play,
  UserPlus,
  Check,
  MoreVertical,
  Trash2,
  Link2,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import ReportModal from '../modals/ReportModal';
import api from '../../services/api';

const ReelPlayer = ({ reel, onOpenComments, onOpenShare }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const optionsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const isOwnReel = Boolean(
    user?._id && reel.author?._id && reel.author._id.toString() === user._id.toString()
  );

  // Close options on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setOptionsOpen(false);
      }
    };
    if (optionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [optionsOpen]);

  // Real-time reel deletion listener (Requirement 15 & 28)
  useEffect(() => {
    if (!socket) return;
    const handleReelDeleted = ({ reelId }) => {
      if (reelId === reel._id) {
        setIsUnavailable(true);
      }
    };
    socket.on('reel:deleted', handleReelDeleted);
    return () => socket.off('reel:deleted', handleReelDeleted);
  }, [socket, reel._id]);

  // Auto-pause when reel leaves viewport (IntersectionObserver)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            videoEl.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            videoEl.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.6, 1.0] }
    );

    observer.observe(videoEl);
    return () => observer.disconnect();
  }, []);

  // Toggle play/pause on video click
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoElPlay();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const videoElPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleToggleLike = async (e) => {
    e.stopPropagation();
    const prev = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prev);
    setLikesCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await api.post(`/reels/${reel._id}/like`);
      if (res.data.success) {
        setIsLiked(res.data.isLiked);
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      setIsLiked(prev);
      setLikesCount(prevCount);
    }
  };

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    const prev = isSaved;
    setIsSaved(!prev);

    try {
      const res = await api.post(`/reels/${reel._id}/save`);
      if (res.data.success) {
        setIsSaved(res.data.isSaved);
        addToast(res.data.isSaved ? 'Reel saved' : 'Reel unsaved', 'info');
      }
    } catch (err) {
      setIsSaved(prev);
    }
  };

  const handleToggleFollow = async (e) => {
    e.stopPropagation();
    if (reel.author?._id === user?._id) return;

    try {
      const res = await api.post(`/follow/${reel.author._id}`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        addToast(res.data.isFollowing ? `Followed ${reel.author.fullName}` : `Unfollowed`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/reel/${reel._id}`);
    addToast('Reel link copied to clipboard!', 'success');
    setOptionsOpen(false);
  };

  const handleDeleteReel = async () => {
    try {
      const res = await api.delete(`/reels/${reel._id}`);
      if (res.data.success) {
        addToast('Reel deleted successfully', 'success');
        setIsDeleted(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete reel', 'error');
    }
  };

  if (isUnavailable || isDeleted) {
    return (
      <div className="relative w-full max-w-sm h-[calc(100dvh-130px)] sm:h-[82vh] max-h-[760px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-6 text-center text-slate-400 text-xs italic select-none">
        This reel is no longer available.
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm h-[calc(100dvh-130px)] sm:h-[82vh] max-h-[760px] mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800 flex items-center justify-center select-none group">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={reel.video}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play/Pause Overlay indicator when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer pointer-events-none"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs">
            <Play className="w-8 h-8 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Top Controls: Mute & More Options */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2" ref={optionsRef}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOptionsOpen(!optionsOpen);
            }}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            title="Reel options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {optionsOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-10 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-xl z-30 py-1.5 text-xs text-white animate-fade-in"
            >
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 text-left transition-colors"
              >
                <Link2 className="w-4 h-4 text-slate-400" />
                <span>Copy link</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOptionsOpen(false);
                  if (onOpenShare) onOpenShare(reel);
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 text-left transition-colors"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Share reel</span>
              </button>

              {/* REEL OWNER ACTIONS (Requirement 15 & 30) */}
              {isOwnReel ? (
                <>
                  <div className="my-1 border-t border-slate-700" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-rose-950/40 text-rose-400 text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Delete reel</span>
                  </button>
                </>
              ) : (
                /* OTHER USERS ONLY (Requirement 15 & 30) */
                <>
                  <div className="my-1 border-t border-slate-700" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsOpen(false);
                      setReportModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-rose-950/40 text-rose-400 text-left transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Report reel</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Right Engagement Rail */}
      <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center space-y-4 text-white">
        {/* Like */}
        <button
          onClick={handleToggleLike}
          className="flex flex-col items-center space-y-1 group/btn"
        >
          <div
            className={`w-11 h-11 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs transition-transform group-hover/btn:scale-110 active:scale-125 ${
              isLiked ? 'text-rose-500' : 'text-white'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-[11px] font-bold">{likesCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenComments) onOpenComments(reel);
          }}
          className="flex flex-col items-center space-y-1 group/btn"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs transition-transform group-hover/btn:scale-110 text-white">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold">{reel.commentsCount || 0}</span>
        </button>

        {/* Share to ChatFlow Chat */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenShare) onOpenShare(reel);
          }}
          className="flex flex-col items-center space-y-1 group/btn"
          title="Share"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs transition-transform group-hover/btn:scale-110 text-white">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold">Share</span>
        </button>

        {/* Save */}
        <button
          onClick={handleToggleSave}
          className="flex flex-col items-center space-y-1 group/btn"
          title="Save"
        >
          <div
            className={`w-11 h-11 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs transition-transform group-hover/btn:scale-110 ${
              isSaved ? 'text-brand-400' : 'text-white'
            }`}
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
          </div>
        </button>

        {/* Audio disc spinning animation */}
        <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white/60 flex items-center justify-center text-white animate-spin">
          <Music className="w-4 h-4" />
        </div>
      </div>

      {/* Bottom Creator Info & Caption */}
      <div className="absolute left-4 right-16 bottom-6 z-20 text-white space-y-2 select-text">
        <div className="flex items-center space-x-3">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (reel.author?._id) navigate(`/profile/${reel.author._id}`);
            }}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <Avatar
              src={reel.author?.profilePicture}
              name={reel.author?.fullName}
              size="md"
              className="flex-shrink-0"
            />
            <span className="text-xs font-bold truncate">
              @{reel.author?.username || 'creator'}
            </span>
          </div>

          {reel.author?._id !== user?._id && (
            <button
              onClick={handleToggleFollow}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                isFollowing
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white text-slate-900 border-white hover:bg-white/90'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {reel.caption && (
          <p className="text-xs text-slate-100 line-clamp-2 leading-relaxed">
            {reel.caption}
          </p>
        )}

        {/* Audio info line */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
          <Music className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
          <span className="truncate">
            {reel.audio?.title || 'Original Audio'} • {reel.audio?.artist || reel.author?.fullName}
          </span>
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteReel}
        title="Delete reel?"
        description="This action will remove the reel from ChatFlow."
        confirmLabel="Delete"
        isOwn={isOwnReel}
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="reel"
        targetId={reel._id}
        targetUser={reel.author}
      />
    </div>
  );
};

export default ReelPlayer;
