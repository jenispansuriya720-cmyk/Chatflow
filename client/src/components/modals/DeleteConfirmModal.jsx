import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, WifiOff, Loader2, X } from 'lucide-react';

/**
 * Unified Canonical Delete Confirmation Modal
 * Strict destructive action dialog adhering to Requirements 11, 13, 16, 31, 38
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete content?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  showOptions = false, // E.g. for messages: delete for me vs delete for everyone
  selectedOption = 'for_everyone',
  onOptionChange = null,
  isOwn = true,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isOnline || isDeleting) return;

    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete action failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-scale-up">
        {/* Header Icon + Close */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-2.5 text-amber-600 dark:text-amber-400 text-xs">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">You're offline.</p>
              <p className="text-[11px] opacity-90">Reconnect to delete this content.</p>
            </div>
          </div>
        )}

        {/* Optional Multi-Option Radio (e.g. Delete for me vs Delete for everyone) */}
        {showOptions && isOwn && (
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-dark-border text-xs">
            <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors">
              <input
                type="radio"
                name="deleteOption"
                value="for_everyone"
                checked={selectedOption === 'for_everyone'}
                onChange={() => onOptionChange && onOptionChange('for_everyone')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Delete for everyone
              </span>
            </label>
            <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors">
              <input
                type="radio"
                name="deleteOption"
                value="for_me"
                checked={selectedOption === 'for_me'}
                onChange={() => onOptionChange && onOptionChange('for_me')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Delete for me
              </span>
            </label>
          </div>
        )}

        {/* Action Buttons: Cancel (safe) vs Delete (destructive) */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isOnline || isDeleting}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
