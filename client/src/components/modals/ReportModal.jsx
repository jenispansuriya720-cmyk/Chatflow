import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/Toast';

const CATEGORIES = [
  { id: 'spam', label: 'Spam', desc: 'Repetitive, deceptive or promotional content' },
  { id: 'harassment', label: 'Harassment', desc: 'Bullying, targeted abuse or threats' },
  { id: 'hate', label: 'Hate Speech', desc: 'Attacking protected identity traits' },
  { id: 'violence', label: 'Violence', desc: 'Threats or glorification of physical violence' },
  { id: 'sexual_content', label: 'Sexual Content', desc: 'Explicit sexual or non-consensual media' },
  { id: 'scam', label: 'Scam or Fraud', desc: 'Deceptive financial schemes or impersonation' },
  { id: 'misinformation', label: 'Misinformation', desc: 'Harmful, false or misleading claims' },
  { id: 'other', label: 'Other', desc: 'Other violations of community guidelines' },
];

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetUser }) => {
  const { addToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('spam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/reports', {
        targetType,
        targetId,
        targetUser: targetUser?._id || targetUser,
        category: selectedCategory,
        details,
      });

      if (res.data.success) {
        setSubmitted(true);
        addToast('Report submitted successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setDetails('');
    setSelectedCategory('spam');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl space-y-5 animate-sheet-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {submitted ? 'Report Submitted' : 'Why are you reporting this?'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {targetUser?.username ? `@${targetUser.username}` : `Reporting this ${targetType}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Report submitted.
              </h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs mx-auto leading-relaxed">
                Thank you for helping keep ChatFlow safe. Our moderation team reviews all reports against our Community Guidelines.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-start p-2.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-brand-500/10 border-brand-500/40 dark:bg-brand-500/15'
                      : 'border-slate-200/80 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportCategory"
                    value={cat.id}
                    checked={selectedCategory === cat.id}
                    onChange={() => setSelectedCategory(cat.id)}
                    className="mt-0.5 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="ml-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {cat.label}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {cat.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Optional Details */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-dark-muted">
                Additional context (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Help us understand the issue..."
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
