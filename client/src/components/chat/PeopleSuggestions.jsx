import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Check,
  Clock,
  MessageSquare,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../common/Toast';
import Avatar from '../common/Avatar';

const PeopleSuggestions = ({ layout = 'full', limit = 10, title }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);

  const { startDirectChat } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/suggestions?limit=${limit}`);
      if (res.data.success) {
        setSuggestions(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load user suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Handle Connect / Follow
  const handleConnect = async (targetUser) => {
    try {
      setConnectingId(targetUser._id);
      const res = await api.post(`/follow/${targetUser._id}`);
      if (res.data.success) {
        addToast(res.data.message || 'Connection updated', 'success');
        setSuggestions((prev) =>
          prev.map((u) => {
            if (u._id === targetUser._id) {
              const isNowFollowing = Boolean(res.data.isFollowing);
              const isNowPending = Boolean(res.data.isPending);
              return {
                ...u,
                isFollowing: isNowFollowing,
                isPending: isNowPending,
                relationship: isNowPending
                  ? 'Pending Connection'
                  : isNowFollowing
                  ? 'Connected'
                  : 'People you may know',
              };
            }
            return u;
          })
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update connection';
      addToast(msg, 'error');
    } finally {
      setConnectingId(null);
    }
  };

  // Handle Message
  const handleMessage = async (targetUser) => {
    try {
      setMessagingId(targetUser._id);
      const conv = await startDirectChat(targetUser._id);
      if (conv?._id) {
        navigate(`/chat/${conv._id}`);
      }
    } catch (err) {
      console.error('Failed to open direct conversation:', err);
      addToast('Could not start conversation', 'error');
    } finally {
      setMessagingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        <span className="text-xs">Finding people you may know...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  // Compact layout (used inside ChatList or sidebar drawer)
  if (layout === 'compact') {
    return (
      <div className="w-full py-2">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-dark-muted uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-brand-500" />
            {title || 'People you may know'}
          </span>
          <span className="text-[10px] text-slate-400">
            {suggestions.length} suggested
          </span>
        </div>

        <div className="space-y-1.5 px-2">
          {suggestions.map((u) => {
            const isConnLoading = connectingId === u._id;
            const isMsgLoading = messagingId === u._id;
            const isConnectedOrFollowing = u.isFollowing || u.isConnected;

            return (
              <div
                key={u._id}
                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border/60 hover:border-slate-300 dark:hover:border-dark-border transition-all"
              >
                <div
                  onClick={() => navigate(`/profile/${u._id}`)}
                  className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer mr-2"
                >
                  <Avatar
                    src={u.avatar || u.profilePicture}
                    name={u.fullName || u.name}
                    size="sm"
                    status={u.isOnline ? 'online' : null}
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {u.fullName || u.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-dark-muted truncate">
                      @{u.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  {/* Connect Button */}
                  <button
                    onClick={() => handleConnect(u)}
                    disabled={isConnLoading}
                    aria-label={`Connect with ${u.fullName || u.username}`}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center space-x-1 transition-all active:scale-95 ${
                      isConnectedOrFollowing
                        ? 'bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-200'
                        : u.isPending
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-100 border border-brand-200 dark:border-brand-500/30'
                    }`}
                  >
                    {isConnLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isConnectedOrFollowing ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Connected</span>
                      </>
                    ) : u.isPending ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Pending</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>

                  {/* Message Button */}
                  <button
                    onClick={() => handleMessage(u)}
                    disabled={isMsgLoading}
                    aria-label={`Message ${u.fullName || u.username}`}
                    className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center"
                    title="Start Conversation"
                  >
                    {isMsgLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full / Desktop layout (empty conversation area state)
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-indigo-500/20 text-brand-600 dark:text-brand-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {title || 'Start a conversation'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-dark-muted max-w-md mx-auto mt-1">
          Connect with real people on ChatFlow or send an instant direct message to start chatting.
        </p>
      </div>

      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-dark-border/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-dark-surface/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-500" />
            People you may know
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {suggestions.length} available
          </span>
        </div>

        {suggestions.map((u) => {
          const isConnLoading = connectingId === u._id;
          const isMsgLoading = messagingId === u._id;
          const isConnectedOrFollowing = u.isFollowing || u.isConnected;

          return (
            <div
              key={u._id}
              className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-slate-50 dark:hover:bg-dark-surface/40 transition-colors"
            >
              <div
                onClick={() => navigate(`/profile/${u._id}`)}
                className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer mr-3"
              >
                <Avatar
                  src={u.avatar || u.profilePicture}
                  name={u.fullName || u.name}
                  size="md"
                  status={u.isOnline ? 'online' : null}
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {u.fullName || u.name}
                    </p>
                    {u.isOnline && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-dark-muted truncate">
                    @{u.username}
                  </p>
                  {u.bio && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                      {u.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Real Connect / Follow Button */}
                <button
                  type="button"
                  onClick={() => handleConnect(u)}
                  disabled={isConnLoading}
                  aria-label={`Connect with ${u.fullName || u.username}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95 ${
                    isConnectedOrFollowing
                      ? 'bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-dark-border'
                      : u.isPending
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-dark-hover dark:hover:bg-dark-card text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-dark-border'
                  }`}
                >
                  {isConnLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isConnectedOrFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Connected</span>
                    </>
                  ) : u.isPending ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Requested</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Connect</span>
                    </>
                  )}
                </button>

                {/* Real Message Button */}
                <button
                  type="button"
                  onClick={() => handleMessage(u)}
                  disabled={isMsgLoading}
                  aria-label={`Message ${u.fullName || u.username}`}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all active:scale-95 flex items-center space-x-1.5"
                >
                  {isMsgLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeopleSuggestions;
