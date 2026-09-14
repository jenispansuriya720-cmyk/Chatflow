import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Eye, Heart, Flame, Smile, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const DURATION_PER_STORY_MS = 5000;

const StoryViewerModal = ({ storyGroup, onClose, onNextGroup, onPrevGroup }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);

  const stories = storyGroup?.stories || [];
  const currentStory = stories[currentIndex];
  const isOwnStory = storyGroup?.user?._id === user?._id;

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Mark story as viewed on active change
  useEffect(() => {
    if (currentStory && !isOwnStory) {
      api.post(`/stories/${currentStory._id}/view`).catch(() => {});
    }
  }, [currentStory, isOwnStory]);

  // Timed progress bar & auto-advance
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const interval = 50; // update every 50ms
    const step = (interval / DURATION_PER_STORY_MS) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      if (onNextGroup) onNextGroup();
      else onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      if (onPrevGroup) onPrevGroup();
    }
  };

  const handleReact = async (emoji) => {
    if (!currentStory) return;
    try {
      await api.post(`/stories/${currentStory._id}/react`, { emoji });
      addToast(`Reacted ${emoji} to story`, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || isSendingReply) return;

    try {
      setIsSendingReply(true);
      await api.post(`/stories/${currentStory._id}/reply`, {
        messageText: replyText.trim(),
      });
      addToast('Story reply sent to chat thread!', 'success');
      setReplyText('');
    } catch (err) {
      addToast('Failed to send reply', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!storyGroup || !currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none animate-fade-in"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-sm sm:max-w-md h-[88vh] max-h-[780px] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800">
        {/* Top Progress Bars Segmented */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center space-x-1.5">
          {stories.map((s, idx) => (
            <div
              key={s._id || idx}
              className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
                className="h-full bg-white transition-all duration-75"
              />
            </div>
          ))}
        </div>

        {/* Top User Info & Controls */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <Avatar
              src={storyGroup.user.profilePicture}
              name={storyGroup.user.fullName}
              size="sm"
            />
            <div>
              <span className="text-xs font-bold block truncate max-w-[150px]">
                {storyGroup.user.fullName || storyGroup.user.username}
              </span>
              <span className="text-[10px] opacity-75">
                {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Media & Text Area */}
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
          {currentStory.media ? (
            <img
              src={currentStory.media}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white font-bold text-lg leading-relaxed">
              {currentStory.text}
            </div>
          )}

          {/* Text caption overlay if image has text */}
          {currentStory.media && currentStory.text && (
            <div className="absolute bottom-16 left-4 right-4 p-3 bg-black/60 backdrop-blur-xs rounded-2xl text-white text-xs font-medium text-center shadow-lg">
              {currentStory.text}
            </div>
          )}

          {/* Left/Right Tap Target Zones for Fast Navigation */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            title="Previous Story"
          />
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            title="Next Story"
          />
        </div>

        {/* Bottom Interaction Area */}
        <div className="relative z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent space-y-2">
          {isOwnStory ? (
            /* Viewer list indicator for story creator */
            <div
              onClick={() => {
                setShowViewersList(true);
                setIsPaused(true);
              }}
              className="flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/15 cursor-pointer rounded-2xl text-white text-xs font-medium transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <span>{currentStory.viewers?.length || 0} Views (Click to view)</span>
              </div>
              <div className="flex items-center space-x-1">
                {(currentStory.reactions || []).slice(0, 5).map((r, i) => (
                  <span key={i} className="text-sm">{r.emoji}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Quick Reactions */}
              <div className="flex items-center justify-center space-x-3">
                {['❤️', '🔥', '😂', '😮', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-xl p-1 hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Reply to ${storyGroup.user.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="flex-1 px-4 py-2 bg-white/15 focus:bg-white/25 border border-white/20 rounded-full text-xs text-white placeholder-white/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Story Viewers Drawer for Author (Section 110) */}
        {showViewersList && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[60%] bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t border-slate-700 z-40 p-4 flex flex-col space-y-3 animate-fade-in text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Story Viewers ({currentStory.viewers?.length || 0})
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowViewersList(false);
                  setIsPaused(false);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-60 pr-1">
              {(currentStory.viewers || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No views yet. Share with friends to get views!
                </p>
              ) : (
                currentStory.viewers.map((v, i) => {
                  const viewerUser = v.user || {};
                  return (
                    <div
                      key={viewerUser._id || i}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar
                          src={viewerUser.profilePicture}
                          name={viewerUser.fullName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {viewerUser.fullName || viewerUser.username || 'ChatFlow User'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            @{viewerUser.username || 'user'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {v.viewedAt
                          ? formatDistanceToNow(new Date(v.viewedAt), { addSuffix: true })
                          : 'viewed'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewerModal;
