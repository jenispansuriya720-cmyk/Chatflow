import React from 'react';

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-brand-500 border-t-transparent ${sizeMap[size]} ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const ChatSkeleton = () => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-dark-hover"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-dark-hover rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 dark:bg-dark-hover rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessageSkeleton = () => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="flex justify-start">
        <div className="w-48 h-12 bg-slate-200 dark:bg-dark-hover rounded-2xl"></div>
      </div>
      <div className="flex justify-end">
        <div className="w-64 h-16 bg-brand-500/20 rounded-2xl"></div>
      </div>
      <div className="flex justify-start">
        <div className="w-56 h-10 bg-slate-200 dark:bg-dark-hover rounded-2xl"></div>
      </div>
    </div>
  );
};
