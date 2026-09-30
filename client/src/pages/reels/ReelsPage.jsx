import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Plus, Film, Loader2, CheckCircle2 } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import ReelPlayer from '../../components/social/ReelPlayer';
import CommentsModal from '../../components/social/CommentsModal';
import SharePostModal from '../../components/social/SharePostModal';
import CreateReelModal from '../../components/social/CreateReelModal';
import api from '../../services/api';

const ReelsPage = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeCommentsReel, setActiveCommentsReel] = useState(null);
  const [activeShareReel, setActiveShareReel] = useState(null);
  const [createReelOpen, setCreateReelOpen] = useState(false);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reels/feed');
      if (res.data.success) {
        setReels(res.data.reels);
      }
    } catch (e) {
      console.error('Failed to load reels:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const touchStartY = useRef(0);
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
  };

  return (
    <div className="flex h-screen h-dvh w-screen overflow-hidden bg-slate-950 text-white select-none">
      <Sidebar onOpenCreateReel={() => setCreateReelOpen(true)} />

      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 h-full flex flex-col items-center justify-center relative p-2 sm:p-6 pt-14 md:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-hidden"
      >
        {/* Floating Upload Reel Action button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
          <button
            onClick={() => setCreateReelOpen(true)}
            className="px-4 py-2 min-h-[40px] rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Reel</span>
          </button>
        </div>

        {/* Vertical Reel Viewer */}
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-xs text-slate-400">Loading Reels...</span>
          </div>
        ) : reels.length > 0 ? (
          <div className="relative flex items-center justify-center w-full h-full max-h-[820px]">
            {/* Previous Reel Button */}
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="hidden md:flex absolute -top-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-30"
                title="Previous Reel"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}

            <ReelPlayer
              reel={reels[currentIndex]}
              onOpenComments={(r) => setActiveCommentsReel(r)}
              onOpenShare={(r) => setActiveShareReel(r)}
            />

            {/* Next Reel Button */}
            {currentIndex < reels.length - 1 && (
              <button
                onClick={handleNext}
                className="hidden md:flex absolute -bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-30"
                title="Next Reel"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
            {/* Responsible Checkpoint (Section 16) */}
            {currentIndex === reels.length - 1 && reels.length > 1 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/20 text-center animate-fade-in shadow-xl max-w-xs">
                <p className="text-xs font-bold text-white flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>You're all caught up</span>
                </p>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  You've seen the latest Reels from people you follow.
                </p>
                <button
                  onClick={() => navigate('/explore')}
                  className="mt-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 underline"
                >
                  Explore More
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 space-y-3">
            <Film className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold">No Reels Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Be the first to create and share a vertical short-form video!
            </p>
            <button
              onClick={() => setCreateReelOpen(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl"
            >
              Upload Reel
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateReelModal
        isOpen={createReelOpen}
        onClose={() => setCreateReelOpen(false)}
        onReelCreated={() => loadReels()}
      />

      {activeCommentsReel && (
        <CommentsModal
          post={activeCommentsReel}
          isOpen={!!activeCommentsReel}
          onClose={() => setActiveCommentsReel(null)}
        />
      )}

      {activeShareReel && (
        <SharePostModal
          post={activeShareReel}
          isOpen={!!activeShareReel}
          onClose={() => setActiveShareReel(null)}
        />
      )}
    </div>
  );
};

export default ReelsPage;
