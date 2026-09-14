import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  EyeOff,
  UserX,
  VolumeX,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import ReportModal from '../modals/ReportModal';
import BlockConfirmModal from '../modals/BlockConfirmModal';
import WhyThisPostModal from '../modals/WhyThisPostModal';
import api from '../../services/api';

const PostCard = ({ post, onOpenComments, onOpenShare, onHidePost }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [inlineComment, setInlineComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Modals
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  const optionsRef = useRef(null);

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

  const handleMuteCreator = async () => {
    if (!post.author?._id) return;
    try {
      await api.post('/users/safety/controls', {
        action: 'mute',
        targetId: post.author._id,
      });
      addToast(`Muted posts from ${post.author.fullName}`, 'info');
      setIsHidden(true);
      setOptionsOpen(false);
    } catch (e) {
      addToast('Failed to mute creator', 'error');
    }
  };

  const handleDismissNotInterested = () => {
    setIsHidden(true);
    setOptionsOpen(false);
    addToast("Post hidden. We'll show less content like this.", 'info');
    if (onHidePost) onHidePost(post._id);
  };

  const mediaList = post.media || [];
  const isOwnPost = post.author?._id === user?._id;

  const handleToggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic UI update
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await api.post(`/posts/${post._id}/like`);
      if (res.data.success) {
        setIsLiked(res.data.isLiked);
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      // Revert on failure
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleToggleSave = async () => {
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      const res = await api.post(`/posts/${post._id}/save`);
      if (res.data.success) {
        setIsSaved(res.data.isSaved);
        addToast(res.data.isSaved ? 'Post saved to collection' : 'Post removed from saved', 'info');
      }
    } catch (err) {
      setIsSaved(prevSaved);
    }
  };

  const handleSendInlineComment = async (e) => {
    e.preventDefault();
    if (!inlineComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await api.post(`/posts/${post._id}/comments`, { text: inlineComment.trim() });
      addToast('Comment posted!', 'success');
      setInlineComment('');
      post.commentsCount = (post.commentsCount || 0) + 1;
    } catch (err) {
      addToast('Failed to post comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isHidden) return null;

  return (
    <article className="bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow select-none">
      {/* 1. Header: Author & Location */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3 min-w-0">
          <Avatar
            src={post.author?.profilePicture}
            name={post.author?.fullName}
            size="md"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {post.author?.fullName || 'ChatFlow User'}
            </h3>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
              <span>@{post.author?.username}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
              {post.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-0.5 text-brand-500 truncate">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{post.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative" ref={optionsRef}>
          <button
            onClick={() => setOptionsOpen(!optionsOpen)}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Post options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {optionsOpen && (
            <div className="absolute right-0 top-8 w-52 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl z-30 py-1.5 animate-fade-in text-xs">
              <button
                onClick={() => {
                  setOptionsOpen(false);
                  setWhyOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-200 text-left transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <span>Why am I seeing this?</span>
              </button>

              <button
                onClick={handleDismissNotInterested}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-200 text-left transition-colors"
              >
                <EyeOff className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Not interested</span>
              </button>

              {!isOwnPost && (
                <>
                  <button
                    onClick={handleMuteCreator}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-200 text-left transition-colors"
                  >
                    <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Mute @{post.author?.username}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-dark-border" />

                  <button
                    onClick={() => {
                      setOptionsOpen(false);
                      setReportOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-left transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>Report post</span>
                  </button>

                  <button
                    onClick={() => {
                      setOptionsOpen(false);
                      setBlockOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-left transition-colors"
                  >
                    <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>Block @{post.author?.username}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Media Carousel */}
      {mediaList.length > 0 && (
        <div className="relative w-full aspect-square sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <img
            src={mediaList[currentMediaIndex]?.url}
            alt="Post media"
            className="w-full h-full object-cover"
          />

          {/* Carousel Arrows */}
          {mediaList.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => prev - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {currentMediaIndex < mediaList.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => prev + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1 z-10">
                {mediaList.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentMediaIndex ? 'bg-white w-3' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. Action Bar: Like, Comment, Share, Save */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Like */}
            <button
              onClick={handleToggleLike}
              className={`flex items-center space-x-1.5 transition-transform active:scale-125 ${
                isLiked ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs font-semibold">{likesCount}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => onOpenComments && onOpenComments(post)}
              className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-semibold">{post.commentsCount || 0}</span>
            </button>

            {/* Share to ChatFlow Chat */}
            <button
              onClick={() => onOpenShare && onOpenShare(post)}
              className="text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors"
              title="Share post to Chat"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Save / Bookmark */}
          <button
            onClick={handleToggleSave}
            className={`transition-colors ${
              isSaved ? 'text-brand-500' : 'text-slate-600 dark:text-slate-300 hover:text-brand-500'
            }`}
            title="Save post"
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* 4. Content Caption & Hashtags */}
        {post.content && (
          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <span className="font-bold mr-1.5 text-slate-900 dark:text-white">
              {post.author?.username}
            </span>
            <span>{post.content}</span>
          </div>
        )}

        {/* Hashtags Chips */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 5. Comments Summary & Quick Input */}
        <button
          onClick={() => onOpenComments && onOpenComments(post)}
          className="text-[11px] text-slate-400 hover:underline block pt-1"
        >
          {post.commentsCount > 0
            ? `View all ${post.commentsCount} comments`
            : 'Be the first to comment'}
        </button>

        {/* Inline Comment Field */}
        <form onSubmit={handleSendInlineComment} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="Add a comment..."
            value={inlineComment}
            onChange={(e) => setInlineComment(e.target.value)}
            className="flex-1 text-xs bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
          {inlineComment.trim() && (
            <button
              type="submit"
              disabled={isSubmittingComment}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 px-2"
            >
              Post
            </button>
          )}
        </form>
      </div>

      {/* Safety & Content Control Modals */}
      <WhyThisPostModal
        isOpen={whyOpen}
        onClose={() => setWhyOpen(false)}
        post={post}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post._id}
        targetUser={post.author}
      />

      <BlockConfirmModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        targetUser={post.author}
        onBlocked={() => setIsHidden(true)}
      />
    </article>
  );
};

export default PostCard;
