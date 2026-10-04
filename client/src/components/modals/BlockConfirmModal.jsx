import React, { useState } from 'react';
import { UserX, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';

const BlockConfirmModal = ({ isOpen, onClose, targetUser, onBlocked }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !targetUser) return null;

  const handleBlock = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/users/${targetUser._id}/block`);
      if (res.data.success) {
        addToast(`Blocked @${targetUser.username}`, 'info');
        if (onBlocked) onBlocked(targetUser._id);
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to block user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="w-full max-w-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative inline-block mx-auto">
          <Avatar
            src={targetUser.profilePicture}
            name={targetUser.fullName || targetUser.username}
            size="xl"
            className="ring-4 ring-red-500/20 shadow-lg flex-shrink-0"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
            <UserX className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Block @{targetUser.username}?
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted">
            {targetUser.fullName}
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-dark-hover/60 rounded-2xl text-left space-y-2 border border-slate-100 dark:border-dark-border">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            They won't be able to:
          </p>
          <ul className="text-xs text-slate-500 dark:text-dark-muted space-y-1.5 pl-1">
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>Message you or see when you're online</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>Follow your account or send requests</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>View restricted content or stories</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>Interact with your posts and comments</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Block</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockConfirmModal;
