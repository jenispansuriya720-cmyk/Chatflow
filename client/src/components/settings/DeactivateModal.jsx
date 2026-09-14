import React, { useState } from 'react';
import { Power, AlertTriangle, KeyRound, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/Toast';

const DeactivateModal = ({ isOpen, onClose, onDeactivated }) => {
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('Taking a break');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      addToast('Please confirm your password to deactivate your account', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/settings/account/deactivate', {
        password,
        reason,
      });

      if (res.data.success) {
        addToast(res.data.message || 'Account temporarily deactivated', 'info');
        onDeactivated();
        onClose();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Failed to deactivate account. Check your password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Deactivate Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Temporarily pause your presence on ChatFlow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
          <p className="font-bold flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>What happens when you deactivate:</span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-90">
            <li>Your profile and posts will be hidden from search and other users.</li>
            <li>Direct messages will remain intact and will be restored upon your return.</li>
            <li>You can reactivate at any time simply by signing back into your account.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for Leaving (Optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="Taking a break">Taking a digital break</option>
              <option value="Privacy concerns">Privacy concerns</option>
              <option value="Using another app">Using another app</option>
              <option value="Too distracting">Too distracting</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Confirm Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Deactivating...' : 'Confirm Deactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivateModal;
