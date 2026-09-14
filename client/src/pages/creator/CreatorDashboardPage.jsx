import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Users,
  Film,
  Radio,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Loader2,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CreatorDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/creator/analytics');
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Failed to load creator analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100 select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Creator Studio & Analytics
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Real-time audience reach, engagement metrics, and content insights
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Content</span>
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-xs text-slate-400">Computing analytics from your content...</p>
              </div>
            ) : analytics ? (
              <>
                {/* 1. Primary KPI Metric Cards (Section 32) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Views */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Views</span>
                      <Eye className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {formatNumber(analytics.views)}
                    </p>
                    <p className="text-[10px] text-emerald-500 font-semibold flex items-center space-x-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Authentic impressions</span>
                    </p>
                  </div>

                  {/* Reach */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Reach</span>
                      <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {formatNumber(analytics.reach)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Unique accounts reached
                    </p>
                  </div>

                  {/* Engagement */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Engagement</span>
                      <Heart className="w-4 h-4 text-pink-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {formatNumber(analytics.engagement)}
                    </p>
                    <p className="text-[10px] text-brand-500 font-semibold">
                      {analytics.engagementRate} interaction rate
                    </p>
                  </div>

                  {/* Followers */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Followers</span>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {analytics.followers}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {analytics.following} following
                    </p>
                  </div>
                </div>

                {/* 2. Content Overview Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Posts Published</p>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {analytics.postsCount}
                      </h4>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Vertical Reels</p>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {analytics.reelsCount}
                      </h4>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                      <Radio className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Live Broadcast</p>
                      <button
                        onClick={() => navigate('/live/broadcast')}
                        className="text-xs font-bold text-red-500 hover:text-red-600 block mt-0.5"
                      >
                        Start Broadcast Studio &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Top Content Breakdown (Section 32 & 33) */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Top Performing Content
                    </h3>
                    <span className="text-[11px] text-slate-400">Based on likes & interactions</span>
                  </div>

                  {analytics.topPosts.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-dark-border">
                      {analytics.topPosts.map((p) => (
                        <div key={p._id} className="py-3 flex items-center justify-between">
                          <div className="space-y-1 max-w-md">
                            <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                              {p.content || 'Photo Post'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Published {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-dark-muted font-semibold">
                            <span className="flex items-center space-x-1">
                              <Heart className="w-3.5 h-3.5 text-pink-500" />
                              <span>{p.likesCount}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="w-3.5 h-3.5 text-brand-500" />
                              <span>{p.commentsCount}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No posts published yet. Share your first post to see analytics!
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreatorDashboardPage;
