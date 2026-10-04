import React, { useState } from 'react';
import { X, Search, Forward, Check } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const ForwardModal = ({ message, onClose }) => {
  const { conversations, selectConversation } = useChat();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [isForwarding, setIsForwarding] = useState(false);

  const filtered = conversations.filter((c) => {
    const isGroup = c.type === 'group';
    const otherParticipant = !isGroup
      ? c.participants?.find((p) => p._id !== user?._id)
      : null;
    const name = isGroup
      ? c.groupName
      : otherParticipant?.fullName || otherParticipant?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async () => {
    if (!selectedConvId || !message) return;
    try {
      setIsForwarding(true);
      const res = await api.post(`/messages/${message._id}/forward`, {
        targetConversationId: selectedConvId,
      });
      if (res.data.success) {
        addToast('Message forwarded successfully', 'success');
        onClose();
        selectConversation(selectedConvId);
      }
    } catch (err) {
      console.error('Failed to forward:', err);
      addToast('Failed to forward message', 'error');
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 animate-sheet-up sm:animate-scale-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <Forward className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Forward Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview */}
        <div className="px-3 py-2 bg-slate-100 dark:bg-dark-hover rounded-xl text-xs text-slate-600 dark:text-slate-300 italic border-l-4 border-brand-500 truncate">
          "{message.text || 'Media attachment'}"
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search destination chat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-dark-surface rounded-xl text-xs border border-transparent focus:border-brand-500 focus:outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* List of conversations */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((conv) => {
            const isGroup = conv.type === 'group';
            const otherParticipant = !isGroup
              ? conv.participants?.find((p) => p._id !== user?._id)
              : null;
            const name = isGroup
              ? conv.groupName
              : otherParticipant?.fullName || otherParticipant?.username || 'Chat';
            const avatar = isGroup ? conv.groupImage : otherParticipant?.profilePicture;
            const isSelected = selectedConvId === conv._id;

            return (
              <div
                key={conv._id}
                onClick={() => setSelectedConvId(conv._id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-brand-500/15 ring-1 ring-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar src={avatar} name={name} size="sm" className="flex-shrink-0" />
                  <span className="text-xs truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-brand-600" />}
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedConvId || isForwarding}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
          >
            {isForwarding ? 'Forwarding...' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
