import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const CommentsModal = ({ post, isOpen, onClose, postId, postAuthor, postCaption }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectivePostId = post?._id || postId;

  useEffect(() => {
    if (effectivePostId && isOpen) {
      loadComments();
    }
  }, [effectivePostId, isOpen]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/posts/${effectivePostId}/comments`);
      if (res.data.success) {
        setComments(res.data.comments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/posts/${effectivePostId}/comments`, {
        text: text.trim(),
      });
      if (res.data.success) {
        setComments((prev) => [...prev, res.data.comment]);
        setText('');
        if (post) {
          post.commentsCount = (post.commentsCount || 0) + 1;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !effectivePostId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl max-w-md w-full h-[85dvh] sm:h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-sheet-up sm:animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Comments ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment._id} className="flex items-start space-x-3">
                <Avatar
                  src={comment.author?.profilePicture}
                  name={comment.author?.fullName}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-50 dark:bg-dark-surface p-3 rounded-2xl border border-slate-100 dark:border-dark-border">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {comment.author?.fullName || comment.author?.username}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block px-2">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No comments yet. Be the first to join the conversation!
            </div>
          )}
        </div>

        {/* Comment input footer */}
        <form
          onSubmit={handleAddComment}
          className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-100 dark:border-dark-border flex items-center space-x-2 bg-slate-50 dark:bg-dark-surface"
        >
          <Avatar
            src={user?.profilePicture}
            name={user?.fullName}
            size="sm"
            className="flex-shrink-0"
          />
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-4 py-2 text-xs bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-full focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsModal;
