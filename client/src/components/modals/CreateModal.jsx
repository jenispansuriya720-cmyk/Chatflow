import React from 'react';
import { X, Image, PlusCircle, Film, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateModal = ({ isOpen, onClose, onOpenCreatePost, onOpenCreateStory, onOpenCreateReel }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Create New Content
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Create Post */}
          <button
            onClick={() => {
              onClose();
              if (onOpenCreatePost) onOpenCreatePost();
            }}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface hover:border-brand-500 hover:bg-brand-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Image className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">New Post</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Photo, text & tags</span>
          </button>

          {/* Add Story */}
          <button
            onClick={() => {
              onClose();
              if (onOpenCreateStory) onOpenCreateStory();
            }}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface hover:border-amber-500 hover:bg-amber-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Your Story</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Expires in 24 hours</span>
          </button>

          {/* Share Reel */}
          <button
            onClick={() => {
              onClose();
              if (onOpenCreateReel) onOpenCreateReel();
            }}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface hover:border-rose-500 hover:bg-rose-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Reel</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Short vertical video</span>
          </button>

          {/* Go Live */}
          <button
            onClick={() => {
              onClose();
              navigate('/live/broadcast');
            }}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface hover:border-red-500 hover:bg-red-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Go Live</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Real-time broadcast</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
