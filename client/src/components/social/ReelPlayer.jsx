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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const ReelPlayer = ({ reel, onOpenComments, onOpenShare }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Toggle play/pause on video click
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
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

  return (
    <div className="relative w-full max-w-sm h-[82vh] max-h-[760px] mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800 flex items-center justify-center select-none group">
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

      {/* Mute/Unmute Icon top right */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-20"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

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
    </div>
  );
};

export default ReelPlayer;
