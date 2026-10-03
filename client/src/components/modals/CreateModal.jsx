import React, { useEffect } from 'react';
import { X, BookOpen, FileText, Film, ChevronRight } from 'lucide-react';

const CreateModal = ({
  isOpen,
  onClose,
  onOpenCreateStory,
  onOpenCreatePost,
  onOpenCreateReel,
}) => {
  // Listen for Escape key to close menu (Requirement 17)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create menu"
    >
      <div
        className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl w-full max-w-sm p-4 sm:p-5 shadow-2xl space-y-3.5 animate-scale-in mb-16 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              Create New
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create menu"
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Core Creation Actions: Story, Post, Reel */}
        <div className="space-y-2">
          {/* 1. Create Story */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreateStory) onOpenCreateStory();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-dark-border/80 bg-slate-50/70 dark:bg-dark-surface/60 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all text-left group active:scale-[0.99] touch-manipulation min-h-[52px]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-lg">
                📖
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Create Story</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-dark-muted">
                  Share 24h photo or video update
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 2. Create Post */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreatePost) onOpenCreatePost();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-dark-border/80 bg-slate-50/70 dark:bg-dark-surface/60 hover:bg-brand-500/10 hover:border-brand-500/40 transition-all text-left group active:scale-[0.99] touch-manipulation min-h-[52px]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-lg">
                📝
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Create Post</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-dark-muted">
                  Share photo, caption & tags to feed
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 3. Create Reel */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreateReel) onOpenCreateReel();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-dark-border/80 bg-slate-50/70 dark:bg-dark-surface/60 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all text-left group active:scale-[0.99] touch-manipulation min-h-[52px]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-lg">
                🎬
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Create Reel</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-dark-muted">
                  Short vertical video with custom cover
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
