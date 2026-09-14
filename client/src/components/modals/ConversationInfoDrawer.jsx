import React from 'react';
import {
  X,
  Shield,
  Phone,
  Mail,
  Calendar,
  VolumeX,
  Volume2,
  Trash2,
  Ban,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const ConversationInfoDrawer = ({ onClose }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const {
    activeConversation,
    toggleMuteChat,
    fetchConversations,
    selectConversation,
  } = useChat();
  const { addToast } = useToast();

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup
    ? activeConversation.participants?.find((p) => p._id !== user?._id)
    : null;

  const displayName = isGroup
    ? activeConversation.groupName
    : otherParticipant?.fullName || otherParticipant?.username;

  const avatarSrc = isGroup
    ? activeConversation.groupImage
    : otherParticipant?.profilePicture;

  const isOnline = !isGroup && otherParticipant ? isUserOnline(otherParticipant._id) : false;

  const handleBlockUser = async () => {
    if (!otherParticipant) return;
    try {
      await api.post(`/users/${otherParticipant._id}/block`);
      addToast(`${otherParticipant.fullName || 'User'} has been blocked`, 'info');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to block user', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await api.post(`/conversations/${activeConversation._id}/leave`);
      addToast('Left the group', 'info');
      onClose();
      await fetchConversations();
      selectConversation(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to leave group', 'error');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.delete(`/conversations/${activeConversation._id}`);
      addToast('Conversation deleted', 'info');
      onClose();
      await fetchConversations();
      selectConversation(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete conversation', 'error');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-dark-surface border-l border-slate-200 dark:border-dark-border shadow-2xl z-40 flex flex-col animate-slide-up select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isGroup ? 'Group Information' : 'Contact Information'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100 dark:border-dark-border">
          <Avatar
            src={avatarSrc}
            name={displayName}
            size="2xl"
            status={!isGroup ? (isOnline ? 'online' : 'offline') : null}
            className="flex-shrink-0"
          />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {displayName}
          </h4>
          <p className="text-xs text-slate-500 dark:text-dark-muted">
            {isGroup
              ? `${activeConversation.participants?.length || 0} participants`
              : isOnline
              ? 'Active now'
              : 'Offline'}
          </p>

          {!isGroup && otherParticipant?.bio && (
            <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 px-4">
              "{otherParticipant.bio}"
            </p>
          )}

          {isGroup && activeConversation.groupDescription && (
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 px-4">
              {activeConversation.groupDescription}
            </p>
          )}
        </div>

        {/* Contact Details (if direct) */}
        {!isGroup && otherParticipant && (
          <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-dark-border text-xs">
            <h5 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Details
            </h5>

            <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{otherParticipant.email}</span>
            </div>

            {otherParticipant.phone && (
              <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{otherParticipant.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Group Members (if group) */}
        {isGroup && (
          <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Members ({activeConversation.participants?.length || 0})
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeConversation.participants?.map((p) => {
                const isAdmin = activeConversation.admins?.some(
                  (a) => (a._id || a).toString() === p._id.toString()
                );
                const online = isUserOnline(p._id);

                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Avatar
                        src={p.profilePicture}
                        name={p.fullName || p.username}
                        size="sm"
                        status={online ? 'online' : 'offline'}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {p.fullName || p.username}
                          {p._id === user?._id && ' (You)'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Shield className="w-3 h-3" />
                        <span>Admin</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-1 text-xs font-medium">
          <button
            onClick={() => toggleMuteChat(activeConversation._id)}
            className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-slate-700 dark:text-slate-300"
          >
            {activeConversation.isMuted ? (
              <>
                <Volume2 className="w-4 h-4 text-slate-400" />
                <span>Unmute notifications</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Mute notifications</span>
              </>
            )}
          </button>

          {!isGroup && (
            <button
              onClick={handleBlockUser}
              className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors text-slate-700 dark:text-slate-300"
            >
              <Ban className="w-4 h-4 text-slate-400" />
              <span>Block user</span>
            </button>
          )}

          {isGroup && (
            <button
              onClick={handleLeaveGroup}
              className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave group</span>
            </button>
          )}

          <button
            onClick={handleDeleteChat}
            className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete conversation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationInfoDrawer;
