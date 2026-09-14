import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  UserX,
  VolumeX,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const SafetyCenterPage = () => {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('safety'); // 'safety', 'privacy', 'security', 'community'
  const [loading, setLoading] = useState(true);

  // Safety data
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [restrictedUsers, setRestrictedUsers] = useState([]);
  const [mutedCreators, setMutedCreators] = useState([]);
  const [hiddenWords, setHiddenWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [reports, setReports] = useState([]);

  // Privacy Settings state
  const [privacy, setPrivacy] = useState({
    isPrivate: user?.isPrivate || false,
    messagePermissions: user?.privacySettings?.messagePermissions || 'everyone',
    storyAudience: user?.privacySettings?.storyAudience || 'everyone',
    onlineStatusVisibility: user?.privacySettings?.onlineStatusVisibility || 'everyone',
    lastSeenVisibility: user?.privacySettings?.lastSeenVisibility || 'everyone',
    readReceipts: user?.settings?.readReceipts ?? true,
  });

  // Security
  const [sessions, setSessions] = useState([]);
  const [exportingData, setExportingData] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetchSafetyData();
  }, []);

  const fetchSafetyData = async () => {
    try {
      setLoading(true);
      const [summaryRes, reportsRes, sessionsRes] = await Promise.allSettled([
        api.get('/users/safety/summary'),
        api.get('/reports/history'),
        api.get('/users/sessions'),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.safety) {
        const s = summaryRes.value.data.safety;
        setBlockedUsers(s.blockedUsers || []);
        setRestrictedUsers(s.restrictedUsers || []);
        setMutedCreators(s.mutedCreators || []);
        setHiddenWords(s.hiddenWords || []);
        setPrivacy((prev) => ({
          ...prev,
          isPrivate: s.isPrivate,
          ...(s.privacySettings || {}),
        }));
      }

      if (reportsRes.status === 'fulfilled' && reportsRes.value.data?.reports) {
        setReports(reportsRes.value.data.reports);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data?.sessions) {
        setSessions(sessionsRes.value.data.sessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (targetId) => {
    try {
      const res = await api.post(`/users/${targetId}/unblock`);
      if (res.data.success) {
        setBlockedUsers((prev) => prev.filter((u) => u._id !== targetId));
        addToast('User unblocked', 'info');
      }
    } catch (e) {
      addToast('Failed to unblock user', 'error');
    }
  };

  const handleSafetyAction = async (action, targetId) => {
    try {
      const res = await api.post('/users/safety/controls', { action, targetId });
      if (res.data.success) {
        if (action === 'unrestrict') {
          setRestrictedUsers((prev) => prev.filter((u) => u._id !== targetId));
        } else if (action === 'unmute') {
          setMutedCreators((prev) => prev.filter((u) => u._id !== targetId));
        }
        addToast('Safety setting updated', 'info');
      }
    } catch (e) {
      addToast('Failed to update safety setting', 'error');
    }
  };

  const handleAddHiddenWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    const word = newWord.trim().toLowerCase();
    try {
      const res = await api.post('/users/safety/controls', { action: 'add_word', word });
      if (res.data.success) {
        setHiddenWords((prev) => [...prev, word]);
        setNewWord('');
        addToast(`Added "${word}" to hidden words filter`, 'success');
      }
    } catch (e) {
      addToast('Failed to add word', 'error');
    }
  };

  const handleRemoveHiddenWord = async (word) => {
    try {
      const res = await api.post('/users/safety/controls', { action: 'remove_word', word });
      if (res.data.success) {
        setHiddenWords((prev) => prev.filter((w) => w !== word));
        addToast(`Removed "${word}" from filter`, 'info');
      }
    } catch (e) {
      addToast('Failed to remove word', 'error');
    }
  };

  const handleSavePrivacy = async (updatedFields) => {
    const nextPrivacy = { ...privacy, ...updatedFields };
    setPrivacy(nextPrivacy);

    try {
      const res = await api.put('/users/privacy/settings', nextPrivacy);
      if (res.data.success) {
        addToast('Privacy settings saved', 'success');
        if (res.data.user) updateUser(res.data.user);
      }
    } catch (e) {
      addToast('Failed to save privacy settings', 'error');
    }
  };

  const handleDownloadData = async () => {
    try {
      setExportingData(true);
      const res = await api.get('/users/export-data');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatflow-data-${user?.username || 'archive'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Data archive downloaded successfully', 'success');
    } catch (err) {
      addToast('Failed to export data', 'error');
    } finally {
      setExportingData(false);
    }
  };

  const handleLogoutSessions = async () => {
    try {
      const res = await api.delete('/users/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions || []);
        addToast('Logged out of all other devices', 'success');
      }
    } catch (e) {
      addToast('Failed to logout sessions', 'error');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;

    try {
      setDeletingAccount(true);
      const res = await api.delete('/users/account', {
        data: { password: deletePassword },
      });
      if (res.data.success) {
        addToast('Your account has been deleted. Goodbye!', 'info');
        await logout();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setDeletingAccount(false);
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
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Safety & Privacy Center
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Control your account boundaries, privacy, and personal data
              </p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-dark-border bg-white/70 dark:bg-dark-surface/70 backdrop-blur-md flex items-center space-x-2 sm:space-x-4 overflow-x-auto text-xs font-bold">
          {[
            { id: 'safety', label: 'Your Safety', icon: Shield },
            { id: 'privacy', label: 'Privacy Settings', icon: Eye },
            { id: 'security', label: 'Security & Data', icon: Lock },
            { id: 'community', label: 'Guidelines', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-2 border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-dark-muted dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* 1. Safety Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-6 animate-fade-in">
                {/* Blocked Users */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <UserX className="w-5 h-5 text-red-500" />
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Blocked Accounts ({blockedUsers.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Blocked users cannot message you, follow you, or view your content
                        </p>
                      </div>
                    </div>
                  </div>

                  {blockedUsers.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-dark-border">
                      {blockedUsers.map((u) => (
                        <div key={u._id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar src={u.profilePicture} name={u.fullName} size="sm" className="flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {u.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400">@{u.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(u._id)}
                            className="px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      You haven't blocked any accounts.
                    </p>
                  )}
                </div>

                {/* Restricted & Muted Creators */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <VolumeX className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Muted Creators ({mutedCreators.length})
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Their posts and reels will not appear in your home feed
                      </p>
                    </div>
                  </div>

                  {mutedCreators.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-dark-border">
                      {mutedCreators.map((u) => (
                        <div key={u._id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar src={u.profilePicture} name={u.fullName} size="sm" className="flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {u.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400">@{u.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSafetyAction('unmute', u._id)}
                            className="px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                          >
                            Unmute
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      You haven't muted any creators.
                    </p>
                  )}
                </div>

                {/* Hidden Words & Filter */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Hidden Words Filter
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Hide comments and messages containing these custom words or phrases
                    </p>
                  </div>

                  <form onSubmit={handleAddHiddenWord} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add a word or phrase..."
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={!newWord.trim()}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>

                  {hiddenWords.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {hiddenWords.map((w) => (
                        <span
                          key={w}
                          className="px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-hover text-xs text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 border border-slate-200 dark:border-dark-border"
                        >
                          <span>{w}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHiddenWord(w)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report History */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Your Report History ({reports.length})
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Track the status of reports you've submitted to maintain community safety
                    </p>
                  </div>

                  {reports.length > 0 ? (
                    <div className="space-y-2.5">
                      {reports.map((r) => (
                        <div
                          key={r._id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-hover/50 border border-slate-100 dark:border-dark-border flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                              {r.category.replace('_', ' ')} &bull; {r.targetType}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Submitted on {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'resolved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      You have not submitted any reports.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 2. Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-6">
                  {/* Private Account Toggle */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
                    <div className="space-y-1 pr-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Private Account
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        When active, only approved followers can see your photos, reels, and stories. Your existing followers won't be affected.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={privacy.isPrivate}
                        onChange={(e) => handleSavePrivacy({ isPrivate: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  {/* Who Can Message You */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Who can message you?
                      </h3>
                      <p className="text-xs text-slate-400">
                        Choose who can start direct conversations
                      </p>
                    </div>
                    <select
                      value={privacy.messagePermissions}
                      onChange={(e) => handleSavePrivacy({ messagePermissions: e.target.value })}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="followers">Followers & Connections</option>
                      <option value="none">Nobody</option>
                    </select>
                  </div>

                  {/* Who Can See Your Online Status */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Online Status Visibility
                      </h3>
                      <p className="text-xs text-slate-400">
                        Show when you're actively online
                      </p>
                    </div>
                    <select
                      value={privacy.onlineStatusVisibility}
                      onChange={(e) => handleSavePrivacy({ onlineStatusVisibility: e.target.value })}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="followers">Followers Only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>

                  {/* Story Audience */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Story Audience
                      </h3>
                      <p className="text-xs text-slate-400">
                        Default visibility for newly created 24h stories
                      </p>
                    </div>
                    <select
                      value={privacy.storyAudience}
                      onChange={(e) => handleSavePrivacy({ storyAudience: e.target.value })}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="followers">Approved Followers</option>
                    </select>
                  </div>

                  {/* Read Receipts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Read Receipts (✓✓)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Let people know when you've read their messages
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={privacy.readReceipts}
                        onChange={(e) => handleSavePrivacy({ readReceipts: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Security & Data Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                {/* Active Sessions */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Active Devices & Sessions
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Devices logged into your ChatFlow account
                      </p>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={handleLogoutSessions}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        Logout Other Devices
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {sessions.map((s, idx) => (
                      <div
                        key={s.sessionId || idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-hover/50 border border-slate-100 dark:border-dark-border flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {s.device || 'Desktop'} &bull; {s.browser || 'Browser'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {s.location || 'Current location'} &bull; Last active:{' '}
                            {new Date(s.lastActive).toLocaleTimeString()}
                          </p>
                        </div>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            This Device
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download My Data (Section 38) */}
                <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Download Your Data
                    </h3>
                    <p className="text-xs text-slate-400">
                      Get a complete JSON archive of your profile, posts, reels, contacts, and settings.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadData}
                    disabled={exportingData}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2 flex-shrink-0 disabled:opacity-50"
                  >
                    {exportingData ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Download Data</span>
                  </button>
                </div>

                {/* Delete Account */}
                <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                      Delete Account Permanently
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-dark-muted">
                      Permanently erase your account, messages, posts, stories, and relationships. This cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-colors flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Community Guidelines Tab */}
            {activeTab === 'community' && (
              <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-5 animate-fade-in text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-dark-border">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      ChatFlow Community Principles
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Our shared commitment to authentic, safe, and respectful communication
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      1. People First & Mutual Respect
                    </h4>
                    <p className="mt-0.5 text-slate-500 dark:text-dark-muted">
                      Treat others with dignity. Harassment, bullying, hate speech, and discriminatory behavior are strictly prohibited.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      2. Privacy by Default
                    </h4>
                    <p className="mt-0.5 text-slate-500 dark:text-dark-muted">
                      Do not share private personal information, phone numbers, or private communications without explicit consent.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      3. Authentic Creative Expression
                    </h4>
                    <p className="mt-0.5 text-slate-500 dark:text-dark-muted">
                      Share original moments and content. We reject spam, deceptive impersonation, artificial manipulation, and fraudulent scams.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      4. Healthy & Responsible Boundaries
                    </h4>
                    <p className="mt-0.5 text-slate-500 dark:text-dark-muted">
                      You have full control over who interacts with you. Use Mute, Block, and Report whenever necessary to keep your experience positive.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Account Deletion
              </h3>
              <p className="text-xs text-slate-400">
                Please confirm your password to permanently erase your account and all data.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4 text-left">
              <input
                type="password"
                placeholder="Enter your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover focus:outline-none focus:border-red-500 text-slate-900 dark:text-white"
                required
              />

              <div className="flex items-center space-x-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || !deletePassword}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
                >
                  {deletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyCenterPage;
