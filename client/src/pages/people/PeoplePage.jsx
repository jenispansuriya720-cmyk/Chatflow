import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  Compass,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const INTERESTS = [
  'All',
  'Technology',
  'Design',
  'AI',
  'Gaming',
  'Photography',
  'Music',
  'Travel',
  'Fitness',
  'Coding',
];

const PeoplePage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeople();
  }, [selectedInterest]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPeople();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await api.get(`/users?limit=40${searchParam}`);
      if (res.data?.success) {
        let list = res.data.users || [];
        if (selectedInterest !== 'All') {
          list = list.filter((u) =>
            u.interests?.some(
              (i) => i.toLowerCase() === selectedInterest.toLowerCase()
            )
          );
        }
        setUsers(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId) => {
    try {
      const res = await api.post(`/follow/${targetId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u._id === targetId
              ? { ...u, isFollowing: res.data.isFollowing, isPending: res.data.isPending }
              : u
          )
        );
      }
    } catch (e) {
      addToast('Failed to update follow status', 'error');
    }
  };

  const handleConnectToggle = async (targetId) => {
    try {
      const res = await api.post(`/connections/${targetId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u._id === targetId ? { ...u, connectionStatus: res.data.status } : u
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send connection request', 'error');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100 select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="px-6 py-4 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Find People & Communities
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Connect with creators and colleagues based on real interests
              </p>
            </div>
          </div>
        </header>

        {/* Search & Topic Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-dark-border bg-white/70 dark:bg-dark-surface/70 backdrop-blur-md space-y-3">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search people by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Interests Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
            {INTERESTS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedInterest(tag)}
                className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap ${
                  selectedInterest === tag
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-dark-hover text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-border'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* People Grid Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-xs text-slate-400">Discovering people on ChatFlow...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((person) => {
                  const isConnRequested = person.connectionStatus === 'pending_sent';
                  const isConnected = person.connectionStatus === 'connected';

                  return (
                    <div
                      key={person._id}
                      className="p-5 rounded-3xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div
                        onClick={() => navigate(`/profile/${person._id}`)}
                        className="flex items-start space-x-3 cursor-pointer group"
                      >
                        <Avatar
                          src={person.profilePicture}
                          name={person.fullName}
                          size="lg"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
                            {person.fullName}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">
                            @{person.username}
                          </p>
                          {person.bio && (
                            <p className="text-xs text-slate-500 dark:text-dark-muted line-clamp-2 mt-1 leading-relaxed">
                              {person.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Topic Tags */}
                      {person.interests && person.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {person.interests.slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-hover text-[10px] font-semibold text-slate-500 dark:text-dark-muted"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions: Follow and Connect (Section 35) */}
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleFollowToggle(person._id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            person.isFollowing
                              ? 'bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-300'
                              : person.isPending
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                          }`}
                        >
                          {person.isFollowing ? 'Following' : person.isPending ? 'Requested' : 'Follow'}
                        </button>

                        <button
                          onClick={() => handleConnectToggle(person._id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isConnected
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : isConnRequested
                              ? 'bg-slate-100 dark:bg-dark-hover text-slate-500 border-slate-200 dark:border-dark-border'
                              : 'border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover'
                          }`}
                        >
                          {isConnected ? 'Connected' : isConnRequested ? 'Pending' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 bg-white dark:bg-dark-card rounded-3xl border border-slate-200/80 dark:border-dark-border space-y-3">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No creators found
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Try searching for another keyword or browse all interest topics.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PeoplePage;
