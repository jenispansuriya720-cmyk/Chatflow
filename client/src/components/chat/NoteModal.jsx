import React, { useState, useEffect } from 'react';
import { X, Trash2, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const MAX_NOTE_LENGTH = 60;

const NoteModal = ({ isOpen, onClose, currentNote, onNoteSaved, onNoteDeleted }) => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(currentNote?.text || user?.note?.text || '');
    }
  }, [isOpen, currentNote, user?.note]);

  if (!isOpen) return null;

  const hasExistingNote = Boolean(currentNote?.text || user?.note?.text);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    const cleanText = text.trim();
    if (!cleanText) return;

    try {
      setLoading(true);
      const res = await api.put('/users/note', { text: cleanText });
      if (res.data?.success) {
        addToast?.('success', 'Note shared!');
        const updatedUser = { ...user, note: res.data.note };
        updateUser(updatedUser);
        if (onNoteSaved) onNoteSaved(res.data.note);
        onClose();
      }
    } catch (err) {
      addToast?.('error', err.response?.data?.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await api.delete('/users/note');
      if (res.data?.success) {
        addToast?.('info', 'Note removed.');
        const updatedUser = { ...user, note: { text: '', createdAt: null } };
        updateUser(updatedUser);
        if (onNoteDeleted) onNoteDeleted();
        onClose();
      }
    } catch (err) {
      addToast?.('error', err.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white dark:bg-dark-surface rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-dark-border"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors touch-target"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <h3 id="note-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
            {hasExistingNote ? 'Your Note' : 'Share a thought'}
          </h3>
          <p className="text-xs text-slate-400 dark:text-dark-muted mt-0.5">
            Visible to people you chat with
          </p>
        </div>

        {/* Avatar with Live Floating Thought Bubble */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative flex flex-col items-center">
            {/* Live Thought Bubble Preview */}
            <div
              className={`relative mb-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xs text-xs font-medium text-slate-800 dark:text-slate-100 text-center max-w-[200px] break-words transition-all duration-200 ${
                text.trim() ? 'opacity-100 scale-100' : 'opacity-40 italic'
              }`}
            >
              {text.trim() || 'Share what is on your mind...'}
              {/* Bubble pointer dot */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-100 dark:bg-dark-card border-r border-b border-slate-200 dark:border-dark-border rotate-45" />
            </div>

            {/* Avatar */}
            <Avatar
              src={user?.profilePicture}
              name={user?.fullName || user?.username}
              size="lg"
              className="ring-4 ring-slate-100 dark:ring-dark-hover shadow-sm"
            />
          </div>
        </div>

        {/* Note Input */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              placeholder="Share what's on your mind..."
              rows={2}
              maxLength={MAX_NOTE_LENGTH}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-dark-base border border-slate-200 dark:border-dark-border text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all"
              autoFocus
            />
            <span
              className={`absolute bottom-2.5 right-3 text-[11px] font-semibold ${
                text.length >= MAX_NOTE_LENGTH
                  ? 'text-amber-500'
                  : 'text-slate-400 dark:text-dark-muted'
              }`}
            >
              {text.length}/{MAX_NOTE_LENGTH}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            {hasExistingNote && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 touch-target"
                title="Delete note"
                aria-label="Delete note"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={loading || deleting || !text.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/25 transition-all active:scale-95 touch-target"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{hasExistingNote ? 'Update Note' : 'Share Note'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
