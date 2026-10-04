import React, { useState } from 'react';
import { X, Search, Send, Link2, Check, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const SharePostModal = ({ post, isOpen, onClose }) => {
  const { conversations } = useChat();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !post) return null;

  const filteredConversations = conversations.filter((c) => {
    const isGroup = c.type === 'group';
    const other = !isGroup ? c.participants?.find((p) => p._id !== user?._id) : null;
    const name = isGroup ? c.groupName : other?.fullName || other?.username || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleShareToChat = async () => {
    if (!selectedConvId) return;

    try {
      setIsSharing(true);
      const res = await api.post(`/posts/${post._id}/share`, {
        targetConversationId: selectedConvId,
      });

      if (res.data.success) {
        addToast('Post shared to chat successfully!', 'success');
        onClose();
      }
    } catch (err) {
      addToast('Failed to share post', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    setCopied(true);
    addToast('Post link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 animate-sheet-up sm:animate-scale-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Share Post
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy Link button */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 dark:hover:bg-dark-hover rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
          <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
        </button>

        {/* Search recipient */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Conversation selection list */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
          {filteredConversations.map((conv) => {
            const isGroup = conv.type === 'group';
            const other = !isGroup ? conv.participants?.find((p) => p._id !== user?._id) : null;
            const name = isGroup ? conv.groupName : other?.fullName || other?.username || 'Chat';
            const avatar = isGroup ? conv.groupImage : other?.profilePicture;
            const isSelected = selectedConvId === conv._id;

            return (
              <div
                key={conv._id}
                onClick={() => setSelectedConvId(conv._id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold ring-1 ring-brand-500'
                    : 'hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Avatar src={avatar} name={name} size="sm" className="flex-shrink-0" />
                  <span className="text-xs truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-brand-600" />}
              </div>
            );
          })}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShareToChat}
          disabled={!selectedConvId || isSharing}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSharing ? 'Sending...' : 'Send in Chat'}</span>
        </button>
      </div>
    </div>
  );
};

export default SharePostModal;
