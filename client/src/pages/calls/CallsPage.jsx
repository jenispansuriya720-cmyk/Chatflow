import React, { useState, useEffect } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Trash2,
  Calendar,
  Search,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const CallsPage = () => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const { addToast } = useToast();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'missed', 'incoming', 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCalls();
  }, [filter]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/calls?filter=${filter}`);
      if (res.data.success) {
        setCalls(res.data.calls);
      }
    } catch (err) {
      console.error('Failed to fetch calls:', err);
      addToast('Failed to load call history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCall = async (e, callId) => {
    e.stopPropagation();
    try {
      await api.delete(`/calls/${callId}`);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
      addToast('Call record removed', 'info');
    } catch (err) {
      addToast('Failed to delete call record', 'error');
    }
  };

  const formatCallDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today · ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday · ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d · h:mm a');
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const filteredCalls = calls.filter((call) => {
    const isCaller = call.caller?._id === user?._id;
    const other = isCaller ? call.receiver : call.caller;
    const name = other?.fullName || other?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 min-w-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-dark-border">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                <Phone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>Call History</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                Real-time voice and video logs with end-to-end WebRTC calling
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border text-xs font-semibold">
              {['all', 'missed', 'incoming', 'outgoing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                    filter === tab
                      ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search call logs by contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
            />
          </div>

          {/* Calls List */}
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-dark-border">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading call logs...
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-card text-slate-400 flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No call records found
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {filter === 'all'
                    ? 'Place a voice or video call directly from any contact chat or profile!'
                    : `No ${filter} calls recorded in your history.`}
                </p>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const isCaller = call.caller?._id === user?._id;
                const other = isCaller ? call.receiver : call.caller;
                const isMissed = call.status === 'missed' || call.status === 'declined';

                return (
                  <div
                    key={call._id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-dark-card/50 transition-colors group"
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <Avatar
                        src={other?.profilePicture}
                        name={other?.fullName || other?.username}
                        size="md"
                        status={other?.isOnline ? 'online' : 'offline'}
                        className="flex-shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {other?.fullName || other?.username || 'Unknown Contact'}
                          </h4>

                          {call.type === 'video' ? (
                            <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center space-x-0.5">
                              <Video className="w-3 h-3" />
                              <span>Video</span>
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center space-x-0.5">
                              <Phone className="w-3 h-3" />
                              <span>Voice</span>
                            </span>
                          )}
                        </div>

                        {/* Subtitle with direction icon and date/duration */}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                          {isMissed ? (
                            <span className="flex items-center space-x-1 text-rose-500 font-semibold">
                              <PhoneMissed className="w-3.5 h-3.5" />
                              <span>{call.status === 'declined' ? 'Declined' : 'Missed'}</span>
                            </span>
                          ) : isCaller ? (
                            <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                              <PhoneOutgoing className="w-3.5 h-3.5 text-brand-500" />
                              <span>Outgoing</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                              <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Incoming</span>
                            </span>
                          )}

                          <span>•</span>
                          <span>{formatCallDate(call.createdAt || call.startedAt)}</span>

                          {call.duration > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{formatDuration(call.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Redial & Delete) */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startCall(other, call.type || 'audio')}
                        className="p-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition-colors"
                        title={`Redial ${call.type === 'video' ? 'Video' : 'Voice'} Call`}
                      >
                        {call.type === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteCall(e, call._id)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CallsPage;
