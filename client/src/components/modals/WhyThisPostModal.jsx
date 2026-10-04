import React from 'react';
import { HelpCircle, X, Compass, Sparkles, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WhyThisPostModal = ({ isOpen, onClose, post }) => {
  const navigate = useNavigate();

  if (!isOpen || !post) return null;

  const mainTag = post.hashtags?.[0] || 'community';
  const authorName = post.author?.fullName || 'this creator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="w-full max-w-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center mx-auto shadow-md shadow-brand-500/10">
          <HelpCircle className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Why this post?
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted">
            Transparent recommendations by ChatFlow
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-dark-hover/60 rounded-2xl text-left space-y-2.5 border border-slate-100 dark:border-dark-border">
          <div className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <p>
              You follow <strong className="text-slate-900 dark:text-white">#{mainTag}</strong> and have interacted with similar creative topics in your feed.
            </p>
          </div>
          <div className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Compass className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p>
              Content from <strong className="text-slate-900 dark:text-white">{authorName}</strong> is actively shared within topics you explore.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/people');
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Recommendations</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-dark-muted dark:hover:text-slate-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhyThisPostModal;
