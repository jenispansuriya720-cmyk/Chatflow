import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Play, Plus, Sparkles, Loader2 } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';

const LiveHubPage = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/live');
      if (res.data.success) {
        setStreams(res.data.streams);
      }
    } catch (e) {
      console.error('Failed to load streams:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100 select-none">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 min-w-0">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-dark-border">
            <div>
              <div className="flex items-center space-x-2">
                <Radio className="w-6 h-6 text-red-500 animate-pulse" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Live Streaming
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                Watch real-time creator broadcasts, tech demos, and community Q&As
              </p>
            </div>

            <button
              onClick={() => navigate('/live/broadcast')}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Go Live Now</span>
            </button>
          </div>

          {/* Active streams grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Live Channels ({streams.length})</span>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              </div>
            ) : streams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {streams.map((stream) => (
                  <div
                    key={stream._id}
                    onClick={() => navigate(`/live/${stream._id}`)}
                    className="group bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-video bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/80 overflow-hidden flex items-center justify-center">
                      {stream.thumbnail ? (
                        <img
                          src={stream.thumbnail}
                          alt={stream.title || 'Stream'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center space-y-2 p-4 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                            <Radio className="w-6 h-6 animate-pulse" />
                          </div>
                          <span className="text-xs font-semibold text-slate-300 line-clamp-1">{stream.title}</span>
                        </div>
                      )}

                      {/* Red LIVE badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>LIVE</span>
                      </div>

                      {/* Viewer count pill */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center space-x-1">
                        <Users className="w-3 h-3 text-slate-300" />
                        <span>{stream.viewerCount || 1}</span>
                      </div>

                      {/* Center hover play */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 ml-0.5 fill-current" />
                        </div>
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="p-4 flex items-start space-x-3">
                      <Avatar
                        src={stream.host?.profilePicture}
                        name={stream.host?.fullName}
                        size="md"
                        className="flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
                          {stream.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-dark-muted truncate mt-0.5">
                          {stream.host?.fullName || 'Host'}
                        </p>
                        {stream.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                            {stream.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/80 dark:border-dark-border">
                <Radio className="w-12 h-12 text-slate-300 dark:text-dark-muted mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No active live broadcasts right now
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Start your own live broadcast to stream video, chat with viewers, and share live demos.
                </p>
                <button
                  onClick={() => navigate('/live/broadcast')}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Start Stream
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveHubPage;
