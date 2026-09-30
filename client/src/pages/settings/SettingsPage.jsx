import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  UserCheck,
  Shield,
  ShieldCheck,
  Lock,
  Bell,
  MessageSquare,
  Share2,
  Sparkles,
  Film,
  Radio,
  Users,
  Bot,
  Sun,
  Moon,
  Eye,
  Globe,
  HardDrive,
  Grid,
  Smartphone,
  BarChart3,
  HelpCircle,
  Info,
  Power,
  Trash2,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  AlertTriangle,
  KeyRound,
  Download,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Volume2,
  Sliders,
  Compass,
  Palette,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

import {
  SettingRow,
  SettingToggle,
  SettingSelect,
  SettingCard,
} from '../../components/settings/SettingRow';
import PrivacyCheckupModal from '../../components/settings/PrivacyCheckupModal';
import SecurityCheckupModal from '../../components/settings/SecurityCheckupModal';
import TwoFactorSetupModal from '../../components/settings/TwoFactorSetupModal';
import DeactivateModal from '../../components/settings/DeactivateModal';

const CATEGORIES = [
  { id: 'account', label: 'Account', icon: User, group: 'Account & Identity' },
  { id: 'profile', label: 'Profile', icon: UserCheck, group: 'Account & Identity' },
  { id: 'privacy', label: 'Privacy', icon: Lock, group: 'Privacy & Protection' },
  { id: 'security', label: 'Security', icon: Shield, group: 'Privacy & Protection' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Preferences & Experience' },
  { id: 'messages', label: 'Messages & Calls', icon: MessageSquare, group: 'Preferences & Experience' },
  { id: 'social', label: 'Social & Content', icon: Share2, group: 'Preferences & Experience' },
  { id: 'stories', label: 'Stories', icon: Sparkles, group: 'Preferences & Experience' },
  { id: 'reels', label: 'Reels', icon: Film, group: 'Preferences & Experience' },
  { id: 'live', label: 'Live', icon: Radio, group: 'Preferences & Experience' },
  { id: 'communities', label: 'Communities & Groups', icon: Users, group: 'Preferences & Experience' },
  { id: 'ai', label: 'AI & Smart Features', icon: Bot, group: 'System & Appearance' },
  { id: 'appearance', label: 'Appearance', icon: Sun, group: 'System & Appearance' },
  { id: 'accessibility', label: 'Accessibility', icon: Eye, group: 'System & Appearance' },
  { id: 'language', label: 'Language & Region', icon: Globe, group: 'System & Appearance' },
  { id: 'data', label: 'Data & Storage', icon: HardDrive, group: 'System & Appearance' },
  { id: 'connected-apps', label: 'Connected Apps', icon: Grid, group: 'Ecosystem & Support' },
  { id: 'devices', label: 'Devices & Sessions', icon: Smartphone, group: 'Privacy & Protection' },
  { id: 'creator', label: 'Creator Tools', icon: BarChart3, group: 'Ecosystem & Support' },
  { id: 'safety', label: 'Safety Center', icon: ShieldCheck, group: 'Privacy & Protection' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, group: 'Ecosystem & Support' },
  { id: 'about', label: 'About ChatFlow', icon: Info, group: 'Ecosystem & Support' },
  { id: 'account-management', label: 'Account Management', icon: Power, group: 'Account & Identity', danger: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { category: routeCategory } = useParams();

  const [activeCategory, setActiveCategory] = useState(routeCategory || 'account');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(routeCategory));
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Modals
  const [privacyCheckupOpen, setPrivacyCheckupOpen] = useState(false);
  const [securityCheckupOpen, setSecurityCheckupOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Password Change in Profile/Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    website: '',
    location: '',
    pronouns: '',
    profession: '',
  });

  // Fetch Settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
        if (res.data.settings.profile) {
          setProfileForm((prev) => ({
            ...prev,
            website: res.data.settings.profile.website || '',
            location: res.data.settings.profile.location || '',
            pronouns: res.data.settings.profile.pronouns || '',
            profession: res.data.settings.profile.profession || '',
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get('/users/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchSessions();
  }, []);

  // Update Settings in MongoDB & local state
  const handleUpdateSettings = async (section, data) => {
    try {
      // Optimistic update
      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...(prev ? prev[section] : {}),
          ...data,
        },
      }));

      const res = await api.patch('/settings', {
        [section]: data,
      });

      if (res.data.success) {
        setSettings(res.data.settings);
        addToast('Setting updated', 'success');

        // Sync theme if appearance changed
        if (section === 'appearance' && data.theme) {
          setTheme(data.theme);
        }
        // Sync user context if privacy changed
        if (section === 'privacy' && data.accountPrivacy) {
          updateUser({ ...user, isPrivate: data.accountPrivacy === 'private' });
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update setting', 'error');
      fetchSettings(); // Revert on failure
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      const res = await api.delete('/users/sessions');
      if (res.data.success) {
        addToast('Logged out of all other devices', 'info');
        fetchSessions();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to terminate other sessions', 'error');
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await api.post('/settings/data/clear-cache');
      if (res.data.success) {
        setSettings((prev) => ({
          ...prev,
          data: { ...prev.data, cachedMediaBytes: 0 },
        }));
        addToast('Cache cleared successfully', 'info');
      }
    } catch (err) {
      addToast('Failed to clear cache', 'error');
    }
  };

  const handleClearAiHistory = async () => {
    try {
      const res = await api.post('/settings/ai/clear-history');
      if (res.data.success) {
        addToast(res.data.message || 'AI history cleared', 'info');
      }
    } catch (err) {
      addToast('Failed to clear AI history', 'error');
    }
  };

  const handleRevokeApp = async (appId) => {
    try {
      const res = await api.post('/settings/connected-apps/revoke', { appId });
      if (res.data.success) {
        setSettings((prev) => ({
          ...prev,
          connectedApps: res.data.connectedApps,
        }));
        addToast('Application access revoked', 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to revoke application', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        addToast('Password updated successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      addToast('Please enter your password to confirm deletion', 'warning');
      return;
    }

    try {
      setIsDeletingAccount(true);
      const res = await api.post('/auth/delete-account', {
        password: deletePassword,
      });
      if (res.data.success) {
        addToast('Your account has been permanently deleted.', 'info');
        setDeleteModalOpen(false);
        setDeletePassword('');
        await logout();
        navigate('/login');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Invalid password. Deletion failed.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', {
        fullName: profileForm.fullName,
        username: profileForm.username,
        bio: profileForm.bio,
      });

      await handleUpdateSettings('profile', {
        website: profileForm.website,
        location: profileForm.location,
        pronouns: profileForm.pronouns,
        profession: profileForm.profession,
      });

      if (res.data.success) {
        updateUser(res.data.user);
        addToast('Profile saved successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save profile', 'error');
    }
  };

  // Search Engine Index
  const searchIndex = useMemo(() => {
    const items = [
      { category: 'privacy', title: 'Who can message me', keywords: 'messages chat dm who can message permissions inbox' },
      { category: 'appearance', title: 'Dark mode & Theme', keywords: 'dark mode light theme colors system' },
      { category: 'security', title: 'Two-factor authentication (2FA)', keywords: '2fa two factor authenticator codes backup security' },
      { category: 'security', title: 'Change password', keywords: 'password credentials security change reset' },
      { category: 'devices', title: 'Active login sessions', keywords: 'devices sessions logout remote login ip' },
      { category: 'privacy', title: 'Online status & Read receipts', keywords: 'online active status read receipts double checkmarks' },
      { category: 'notifications', title: 'Quiet hours & Notifications', keywords: 'quiet hours mute pause notifications push email sms alerts' },
      { category: 'messages', title: 'Disappearing messages & Calls', keywords: 'disappearing messages calls audio video density enter key' },
      { category: 'social', title: 'Personalized feed & Sensitive content', keywords: 'feed algorithm recommendations sensitive content autoplay' },
      { category: 'stories', title: 'Story privacy & Close friends', keywords: 'stories audience close friends replies reactions archive' },
      { category: 'reels', title: 'Reel autoplay & Download permissions', keywords: 'reels video autoplay download remix captions' },
      { category: 'ai', title: 'AI assistant & Smart features', keywords: 'ai assistant summaries suggested replies translation history' },
      { category: 'accessibility', title: 'Reduce motion & High contrast', keywords: 'accessibility motion font size contrast screen reader captions' },
      { category: 'data', title: 'Download my data (JSON export)', keywords: 'download my data export json backup storage cache' },
      { category: 'connected-apps', title: 'Connected apps & OAuth', keywords: 'connected apps oauth permissions integrations github google' },
      { category: 'safety', title: 'Blocked & Restricted accounts', keywords: 'blocked restricted muted hidden words report safety' },
      { category: 'account-management', title: 'Delete account & Deactivation', keywords: 'delete account deactivate danger zone close account' },
    ];
    return items;
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return searchIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, searchIndex]);

  const selectCategory = (catId) => {
    setActiveCategory(catId);
    setMobileDetailOpen(true);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Global Settings Header */}
        <header className="bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border px-4 md:px-8 pt-14 md:pt-4 pb-4 flex-shrink-0 z-20">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Settings Center
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                Manage your account, privacy, security and ChatFlow experience
              </p>
            </div>

            {/* Search Settings Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all settings (e.g. 'dark mode', 'who can message me')..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
              />

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-dark-border animate-fade-in">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => selectCategory(res.category)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-dark-card cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {res.title}
                        </p>
                        <p className="text-[10px] text-brand-600 dark:text-brand-400 capitalize">
                          Category: {res.category.replace('-', ' ')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Mini-Card */}
            <div className="hidden lg:flex items-center space-x-3 pl-4 border-l border-slate-200 dark:border-dark-border">
              <Avatar
                src={user?.profilePicture}
                name={user?.fullName || user?.username}
                size="sm"
                status="online"
                className="flex-shrink-0"
              />
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
              >
                View
              </button>
            </div>
          </div>

          {/* Quick Actions Bar (Section 27) */}
          <div className="max-w-6xl mx-auto flex items-center space-x-2 pt-3 mt-3 border-t border-slate-100 dark:border-dark-border overflow-x-auto no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Quick Actions:
            </span>
            <button
              onClick={() => setPrivacyCheckupOpen(true)}
              className="px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap transition-colors flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Checkup</span>
            </button>
            <button
              onClick={() => setSecurityCheckupOpen(true)}
              className="px-3 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap transition-colors flex items-center space-x-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Security Status</span>
            </button>
            <button
              onClick={() => selectCategory('security')}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <button
              onClick={() => selectCategory('devices')}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Manage Devices</span>
            </button>
            <button
              onClick={() => selectCategory('safety')}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Blocked Accounts</span>
            </button>
            <button
              onClick={async () => {
                window.location.href = `${api.defaults.baseURL || 'http://localhost:5000/api'}/users/export-data`;
              }}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download My Data</span>
            </button>
          </div>
        </header>

        {/* Master Content Area: Split View */}
        <div className="flex-1 flex overflow-hidden max-w-6xl w-full mx-auto">
          {/* Left Settings Sidebar (Desktop & Mobile Category List) */}
          <aside
            className={`w-full md:w-72 lg:w-80 bg-white dark:bg-dark-surface border-r border-slate-200 dark:border-dark-border flex flex-col overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-4 flex-shrink-0 transition-all ${
              mobileDetailOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3 space-y-4">
              {['Account & Identity', 'Privacy & Protection', 'Preferences & Experience', 'System & Appearance', 'Ecosystem & Support'].map(
                (group) => {
                  const groupCats = CATEGORIES.filter((c) => c.group === group);
                  return (
                    <div key={group} className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                        {group}
                      </p>
                      {groupCats.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => selectCategory(cat.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                                : cat.danger
                                ? 'text-rose-600 hover:bg-rose-500/10'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'stroke-[2.5]' : ''}`} />
                              <span className="truncate">{cat.label}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 opacity-40 ${isActive ? 'opacity-100' : ''}`} />
                          </button>
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          </aside>

          {/* Right Detail Pane */}
          <main
            className={`flex-1 overflow-y-auto p-4 md:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12 ${
              mobileDetailOpen ? 'flex flex-col' : 'hidden md:flex flex-col'
            }`}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center space-x-2 pb-4 mb-4 border-b border-slate-200 dark:border-dark-border">
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="p-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-dark-card text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Settings</span>
              </button>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {activeCategory.replace('-', ' ')}
              </h2>
            </div>

            <div className="max-w-2xl w-full space-y-6">
              {/* ========================================================
                  CATEGORY 1: ACCOUNT (Section 3)
              ======================================================== */}
              {activeCategory === 'account' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Account Information"
                    description="Personal account credentials and contact details"
                    icon={User}
                  >
                    <SettingRow
                      title="Full Name"
                      description={user?.fullName}
                      control={
                        <span className="text-xs font-bold text-slate-400">Verified</span>
                      }
                    />
                    <SettingRow
                      title="Username"
                      description={`@${user?.username}`}
                      control={
                        <button
                          onClick={() => selectCategory('profile')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Edit
                        </button>
                      }
                    />
                    <SettingRow
                      title="Email Address"
                      description={user?.email}
                      control={
                        <span className="text-xs font-bold text-slate-400">Primary</span>
                      }
                    />
                    <SettingRow
                      title="Phone Number"
                      description={settings?.account?.phone || 'No phone number attached'}
                      badge={settings?.account?.phoneVerified ? 'Verified' : 'Optional'}
                      control={
                        <button
                          onClick={() => {
                            const newPhone = prompt('Enter your phone number:', settings?.account?.phone || '');
                            if (newPhone !== null) {
                              handleUpdateSettings('account', { phone: newPhone, phoneVerified: true });
                            }
                          }}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {settings?.account?.phone ? 'Change' : 'Add'}
                        </button>
                      }
                    />
                    <SettingRow
                      title="Account Type"
                      description="Account category determines feature set and analytics"
                      control={
                        <SettingSelect
                          value={settings?.account?.accountType || 'personal'}
                          options={[
                            { value: 'personal', label: 'Personal' },
                            { value: 'creator', label: 'Creator' },
                            { value: 'business', label: 'Business' },
                          ]}
                          onChange={(val) => handleUpdateSettings('account', { accountType: val })}
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 2: PROFILE (Section 4)
              ======================================================== */}
              {activeCategory === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <SettingCard
                    title="Public Profile & Bio"
                    description="Information displayed on your public ChatFlow profile"
                    icon={UserCheck}
                  >
                    <div className="py-3 space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                      />
                    </div>

                    <div className="py-3 space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Bio
                      </label>
                      <textarea
                        rows={2}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. San Francisco, CA"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Website
                        </label>
                        <input
                          type="url"
                          placeholder="https://yourwebsite.com"
                          value={profileForm.website}
                          onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Pronouns
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. they/them"
                          value={profileForm.pronouns}
                          onChange={(e) => setProfileForm({ ...profileForm, pronouns: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Profession
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Designer, Engineer"
                          value={profileForm.profession}
                          onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        Save Profile Changes
                      </button>
                    </div>
                  </SettingCard>

                  <SettingCard
                    title="Profile Visibility Controls"
                    description="Choose what statistics and statuses are visible to profile visitors"
                    icon={Eye}
                  >
                    <SettingRow
                      title="Hide Follower Count"
                      description="Follower statistics will only be visible to you"
                      control={
                        <SettingToggle
                          checked={settings?.profile?.hideFollowerCount || false}
                          onChange={(val) => handleUpdateSettings('profile', { hideFollowerCount: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Hide Following Count"
                      description="List of accounts you follow will remain private"
                      control={
                        <SettingToggle
                          checked={settings?.profile?.hideFollowingCount || false}
                          onChange={(val) => handleUpdateSettings('profile', { hideFollowingCount: val })}
                        />
                      }
                    />
                  </SettingCard>
                </form>
              )}

              {/* ========================================================
                  CATEGORY 3: PRIVACY (Section 5)
              ======================================================== */}
              {activeCategory === 'privacy' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Account Isolation & Privacy"
                    description="Primary boundary controls protecting your content and interactions"
                    icon={Lock}
                    action={
                      <button
                        onClick={() => setPrivacyCheckupOpen(true)}
                        className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20"
                      >
                        Run Checkup
                      </button>
                    }
                  >
                    <SettingRow
                      title="Private Account"
                      description="Only approved followers can view your media and feed updates"
                      badge={settings?.privacy?.accountPrivacy === 'private' ? 'Private' : 'Public'}
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.accountPrivacy === 'private'}
                          onChange={(val) =>
                            handleUpdateSettings('privacy', {
                              accountPrivacy: val ? 'private' : 'public',
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Who Can Message Me"
                      description="Who is allowed to initiate direct chats with you"
                      control={
                        <SettingSelect
                          value={settings?.privacy?.messagePermission || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'connections', label: 'Connections' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('privacy', { messagePermission: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Who Can Send Connection Requests"
                      description="Permitted audience for 2-way networking requests"
                      control={
                        <SettingSelect
                          value={settings?.privacy?.connectionPermission || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'friends_of_friends', label: 'Friends of Friends' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('privacy', { connectionPermission: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Who Can Add Me to Groups"
                      description="Prevent being added to unsolicited community chats"
                      control={
                        <SettingSelect
                          value={settings?.privacy?.groupInvitePermission || 'connections'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'connections', label: 'Connections Only' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('privacy', { groupInvitePermission: val })}
                        />
                      }
                    />
                  </SettingCard>

                  <SettingCard
                    title="Presence & Activity Indicators"
                    description="Real-time status indicators visible in chats"
                    icon={Eye}
                  >
                    <SettingRow
                      title="Show Online Status"
                      description="Let connections see when you are active on ChatFlow"
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.onlineStatus ?? true}
                          onChange={(val) => handleUpdateSettings('privacy', { onlineStatus: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Read Receipts"
                      description="Show when you have viewed messages in direct chats"
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.readReceipts ?? true}
                          onChange={(val) => {
                            handleUpdateSettings('privacy', { readReceipts: val });
                            handleUpdateSettings('messages', { readReceipts: val });
                          }}
                        />
                      }
                    />
                    <SettingRow
                      title="Typing Indicator"
                      description="Show real-time typing animation when composing messages"
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.typingIndicator ?? true}
                          onChange={(val) => handleUpdateSettings('privacy', { typingIndicator: val })}
                        />
                      }
                    />
                  </SettingCard>

                  <SettingCard
                    title="Profile Discovery & Indexing"
                    description="Control external and search engine discoverability"
                    icon={Globe}
                  >
                    <SettingRow
                      title="Allow Discovery by Email"
                      description="People with your email address can find your ChatFlow account"
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.emailDiscovery ?? true}
                          onChange={(val) => handleUpdateSettings('privacy', { emailDiscovery: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Search Engine Indexing"
                      description="Allow Google and external engines to index your public profile"
                      control={
                        <SettingToggle
                          checked={settings?.privacy?.searchEngineIndexing ?? false}
                          onChange={(val) => handleUpdateSettings('privacy', { searchEngineIndexing: val })}
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 4: SECURITY (Section 6)
              ======================================================== */}
              {activeCategory === 'security' && (
                <div className="space-y-6">
                  {/* Password Change Card */}
                  <form onSubmit={handleChangePassword}>
                    <SettingCard
                      title="Password & Authentication"
                      description="Protect your account with a strong, distinct password"
                      icon={KeyRound}
                    >
                      <div className="py-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Current Password
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs"
                          />
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors shadow-xs"
                        >
                          {isChangingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </SettingCard>
                  </form>

                  {/* Two-Factor Authentication Card */}
                  <SettingCard
                    title="Two-Factor Authentication (2FA)"
                    description="Require a one-time passcode from an authenticator app when signing in"
                    icon={Smartphone}
                    action={
                      <button
                        onClick={() => setTwoFactorModalOpen(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          settings?.security?.twoFactorEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
                        }`}
                      >
                        {settings?.security?.twoFactorEnabled ? 'Configured ✓' : 'Set Up 2FA'}
                      </button>
                    }
                  >
                    <SettingRow
                      title="Authenticator App Status"
                      description={
                        settings?.security?.twoFactorEnabled
                          ? '2FA is active. 8 recovery backup codes available.'
                          : 'Not configured. Add protection using Google Authenticator or Authy.'
                      }
                      badge={settings?.security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      control={
                        <button
                          onClick={() => setTwoFactorModalOpen(true)}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {settings?.security?.twoFactorEnabled ? 'Manage' : 'Enable'}
                        </button>
                      }
                    />
                    <SettingRow
                      title="New Login Alerts"
                      description="Receive notifications whenever a sign-in occurs from an unrecognized device"
                      control={
                        <SettingToggle
                          checked={settings?.security?.newLoginAlerts ?? true}
                          onChange={(val) => handleUpdateSettings('security', { newLoginAlerts: val })}
                        />
                      }
                    />
                  </SettingCard>

                  {/* Security Activity Log */}
                  <SettingCard
                    title="Security Activity & Audit Log"
                    description="Recent authentication events associated with your account"
                    icon={Shield}
                  >
                    <div className="divide-y divide-slate-100 dark:divide-dark-border text-xs">
                      {settings?.security?.securityLog?.length > 0 ? (
                        settings.security.securityLog.slice(0, 5).map((log, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {log.event}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {log.device || 'Desktop'} • {log.ip || '127.0.0.1'}
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {log.timestamp
                                ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
                                : 'Recent'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="py-3 text-slate-400 text-xs text-center">
                          No anomalous security activity detected.
                        </p>
                      )}
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 5: NOTIFICATIONS (Section 7)
              ======================================================== */}
              {activeCategory === 'notifications' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Global Notification Schedule"
                    description="Silence notifications during rest hours or pause completely"
                    icon={Bell}
                  >
                    <SettingRow
                      title="Pause All Notifications"
                      description="Temporarily suppress sound and push alerts"
                      control={
                        <SettingToggle
                          checked={settings?.notifications?.pauseAll || false}
                          onChange={(val) => handleUpdateSettings('notifications', { pauseAll: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Quiet Hours Schedule"
                      description="Mute non-urgent notifications during nighttime"
                      control={
                        <SettingToggle
                          checked={settings?.notifications?.quietHoursEnabled || false}
                          onChange={(val) =>
                            handleUpdateSettings('notifications', { quietHoursEnabled: val })
                          }
                        />
                      }
                    />
                    {settings?.notifications?.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">From</label>
                          <input
                            type="time"
                            value={settings?.notifications?.quietHoursStart || '22:00'}
                            onChange={(e) =>
                              handleUpdateSettings('notifications', { quietHoursStart: e.target.value })
                            }
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">Until</label>
                          <input
                            type="time"
                            value={settings?.notifications?.quietHoursEnd || '08:00'}
                            onChange={(e) =>
                              handleUpdateSettings('notifications', { quietHoursEnd: e.target.value })
                            }
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </SettingCard>

                  <SettingCard
                    title="Notification Channels"
                    description="Where you want to receive alerts from ChatFlow"
                    icon={Sliders}
                  >
                    <SettingRow
                      title="In-App Banners"
                      description="Display chimes and toasts inside the application"
                      control={
                        <SettingToggle
                          checked={settings?.notifications?.channels?.inApp ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('notifications', {
                              channels: { ...settings?.notifications?.channels, inApp: val },
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Push Notifications"
                      description="Send alerts when ChatFlow is in background or closed"
                      control={
                        <SettingToggle
                          checked={settings?.notifications?.channels?.push ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('notifications', {
                              channels: { ...settings?.notifications?.channels, push: val },
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Email Digests"
                      description="Weekly roundup of mentions and network highlights"
                      control={
                        <SettingToggle
                          checked={settings?.notifications?.channels?.email ?? false}
                          onChange={(val) =>
                            handleUpdateSettings('notifications', {
                              channels: { ...settings?.notifications?.channels, email: val },
                            })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 6: MESSAGES & CALLS (Section 8)
              ======================================================== */}
              {activeCategory === 'messages' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Chat Behavior & Features"
                    description="Preferences for direct messages, media, and text dispatch"
                    icon={MessageSquare}
                  >
                    <SettingRow
                      title="Enter Key Sends Message"
                      description="Press Enter to send, Shift+Enter for a new line"
                      control={
                        <SettingToggle
                          checked={settings?.messages?.enterKeySends ?? true}
                          onChange={(val) => handleUpdateSettings('messages', { enterKeySends: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Rich Link Previews"
                      description="Generate titles and thumbnails when sharing links"
                      control={
                        <SettingToggle
                          checked={settings?.messages?.linkPreviews ?? true}
                          onChange={(val) => handleUpdateSettings('messages', { linkPreviews: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Media Auto-Download"
                      description="Download photos and voice notes automatically"
                      control={
                        <SettingSelect
                          value={settings?.messages?.mediaAutoDownload || 'wifi_only'}
                          options={[
                            { value: 'wifi_only', label: 'Wi-Fi Only' },
                            { value: 'always', label: 'Wi-Fi & Cellular' },
                            { value: 'never', label: 'Never (Manual)' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('messages', { mediaAutoDownload: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Disappearing Messages Default"
                      description="Set a countdown timer for messages in new conversations"
                      control={
                        <SettingSelect
                          value={settings?.messages?.disappearingMessages || 'off'}
                          options={[
                            { value: 'off', label: 'Off' },
                            { value: '24h', label: '24 Hours' },
                            { value: '7d', label: '7 Days' },
                            { value: '90d', label: '90 Days' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('messages', { disappearingMessages: val })
                          }
                        />
                      }
                    />
                  </SettingCard>

                  <SettingCard
                    title="Audio & Video Calls"
                    description="Permissions and privacy boundaries for incoming calls"
                    icon={Radio}
                  >
                    <SettingRow
                      title="Who Can Call Me"
                      description="Allow audio/video calls from selected contacts"
                      control={
                        <SettingSelect
                          value={settings?.messages?.whoCanCall || 'connections'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'connections', label: 'Connections Only' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('messages', { whoCanCall: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Voice Calls Enabled"
                      description="Permit incoming audio calls"
                      control={
                        <SettingToggle
                          checked={settings?.messages?.voiceCallsEnabled ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('messages', { voiceCallsEnabled: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Video Calls Enabled"
                      description="Permit incoming video calls with camera stream"
                      control={
                        <SettingToggle
                          checked={settings?.messages?.videoCallsEnabled ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('messages', { videoCallsEnabled: val })
                          }
                        />
                      }
                    />
                  </SettingCard>

                  {/* Chat Appearance (Requirement 39) */}
                  <SettingCard
                    title="Chat Appearance"
                    description="Default visual theme, bubble contour, and text density applied when no personal theme is set"
                    icon={Palette}
                  >
                    <SettingRow
                      title="Default Chat Theme"
                      description="Global fallback theme for conversations"
                      control={
                        <SettingSelect
                          value={settings?.appearance?.chatAppearance?.defaultTheme || 'default'}
                          options={[
                            { value: 'default', label: 'ChatFlow Default' },
                            { value: 'midnight', label: 'Midnight (Dark Blue)' },
                            { value: 'ocean', label: 'Ocean (Cyan/Aqua)' },
                            { value: 'sunset', label: 'Sunset (Coral/Dusk)' },
                            { value: 'lavender', label: 'Lavender (Pastel Purple)' },
                            { value: 'rose', label: 'Rose (Blush Pink)' },
                            { value: 'forest', label: 'Forest (Pine Emerald)' },
                            { value: 'sky', label: 'Sky (Airy Blue)' },
                            { value: 'minimal', label: 'Minimal (Monochrome)' },
                            { value: 'neon', label: 'Neon Cyber (Gaming)' },
                            { value: 'coffee', label: 'Coffee & Cream (Mocha)' },
                            { value: 'aurora', label: 'Aurora Borealis' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', {
                              chatAppearance: {
                                ...(settings?.appearance?.chatAppearance || {}),
                                defaultTheme: val,
                              },
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Default Bubble Style"
                      description="Contour curvature for incoming and outgoing bubbles"
                      control={
                        <SettingSelect
                          value={settings?.appearance?.chatAppearance?.bubbleStyle || 'classic'}
                          options={[
                            { value: 'classic', label: 'Classic (Balanced tails)' },
                            { value: 'soft', label: 'Soft (Pebble rounded)' },
                            { value: 'compact', label: 'Compact (Slim padding)' },
                            { value: 'minimal', label: 'Minimal (Subtle borders)' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', {
                              chatAppearance: {
                                ...(settings?.appearance?.chatAppearance || {}),
                                bubbleStyle: val,
                              },
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Default Text Size"
                      description="Base text scaling inside conversation bubbles"
                      control={
                        <SettingSelect
                          value={settings?.appearance?.chatAppearance?.fontSize || 'medium'}
                          options={[
                            { value: 'small', label: 'Small (12px)' },
                            { value: 'medium', label: 'Medium (14px)' },
                            { value: 'large', label: 'Large (16px)' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', {
                              chatAppearance: {
                                ...(settings?.appearance?.chatAppearance || {}),
                                fontSize: val,
                              },
                            })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Default Chat Density"
                      description="Vertical row spacing between messages"
                      control={
                        <SettingSelect
                          value={settings?.appearance?.chatAppearance?.density || 'comfortable'}
                          options={[
                            { value: 'comfortable', label: 'Comfortable' },
                            { value: 'compact', label: 'Compact' },
                            { value: 'spacious', label: 'Spacious' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', {
                              chatAppearance: {
                                ...(settings?.appearance?.chatAppearance || {}),
                                density: val,
                              },
                            })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 7: SOCIAL & CONTENT (Section 9)
              ======================================================== */}
              {activeCategory === 'social' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Feed Customization & Sorting"
                    description="Transparent controls for how content appears on your home stream"
                    icon={Share2}
                  >
                    <SettingRow
                      title="Default Feed Order"
                      description="Choose between chronological or interest-based streams"
                      control={
                        <SettingSelect
                          value={settings?.content?.feedSort || 'personalized'}
                          options={[
                            { value: 'personalized', label: 'Personalized' },
                            { value: 'latest', label: 'Latest Chronological' },
                            { value: 'following', label: 'Following Only' },
                          ]}
                          onChange={(val) => handleUpdateSettings('content', { feedSort: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Sensitive Content Filter"
                      description="Filter graphic, adult, or distressing content"
                      control={
                        <SettingSelect
                          value={settings?.content?.sensitiveContent || 'limit'}
                          options={[
                            { value: 'allow', label: 'Show Everything' },
                            { value: 'limit', label: 'Limit (Recommended)' },
                            { value: 'block', label: 'Block All' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('content', { sensitiveContent: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Autoplay Videos"
                      description="Play video media automatically as you scroll"
                      control={
                        <SettingToggle
                          checked={settings?.content?.autoplayVideos ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('content', { autoplayVideos: val })
                          }
                        />
                      }
                    />
                  </SettingCard>

                  <SettingCard
                    title="Recommendation Transparency"
                    description="Learn why content is distributed and control suggestions"
                    icon={Compass}
                  >
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs space-y-2 leading-relaxed">
                      <p className="font-bold text-slate-900 dark:text-white">
                        How ChatFlow Ranks Content
                      </p>
                      <p className="text-slate-500 dark:text-dark-muted text-[11px]">
                        We do not use artificial rage mechanics, fake notifications, or sensationalism.
                        Content is recommended based strictly on creators you follow, your declared topic
                        interests, and explicit saves.
                      </p>
                      <button
                        onClick={() => navigate('/home')}
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 mt-2"
                      >
                        <span>Inspect post cards on Home feed</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 8: STORIES (Section 10)
              ======================================================== */}
              {activeCategory === 'stories' && (
                <div className="space-y-6">
                  <SettingCard
                    title="24-Hour Stories"
                    description="Manage audience, replies, and archiving for temporary posts"
                    icon={Sparkles}
                  >
                    <SettingRow
                      title="Default Story Audience"
                      description="Who can view your stories when published"
                      control={
                        <SettingSelect
                          value={settings?.stories?.storyPrivacy || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'connections', label: 'Connections' },
                            { value: 'close_friends', label: 'Close Friends' },
                          ]}
                          onChange={(val) => handleUpdateSettings('stories', { storyPrivacy: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Story Replies"
                      description="Who can respond to your story in Direct Messages"
                      control={
                        <SettingSelect
                          value={settings?.stories?.storyReplies || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'connections', label: 'Connections' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('stories', { storyReplies: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Allow Story Sharing"
                      description="Permit viewers to share your story as a direct message"
                      control={
                        <SettingToggle
                          checked={settings?.stories?.allowSharing ?? true}
                          onChange={(val) => handleUpdateSettings('stories', { allowSharing: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Automatically Archive Stories"
                      description="Keep expired stories in your private personal archive"
                      control={
                        <SettingToggle
                          checked={settings?.stories?.autoArchive ?? true}
                          onChange={(val) => handleUpdateSettings('stories', { autoArchive: val })}
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 9: REELS (Section 11)
              ======================================================== */}
              {activeCategory === 'reels' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Short-Form Video (Reels)"
                    description="Preferences for vertical video playback and creator permissions"
                    icon={Film}
                  >
                    <SettingRow
                      title="Autoplay Reels"
                      description="Automatically loop next reel upon completion"
                      control={
                        <SettingToggle
                          checked={settings?.reels?.autoplay ?? true}
                          onChange={(val) => handleUpdateSettings('reels', { autoplay: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Data Usage Mode"
                      description="Optimize vertical video streaming for cellular networks"
                      control={
                        <SettingSelect
                          value={settings?.reels?.dataUsage || 'standard'}
                          options={[
                            { value: 'standard', label: 'Standard High Quality' },
                            { value: 'data_saver', label: 'Data Saver (Compress)' },
                          ]}
                          onChange={(val) => handleUpdateSettings('reels', { dataUsage: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Show Closed Captions"
                      description="Display auto-generated subtitles when audio is enabled"
                      control={
                        <SettingToggle
                          checked={settings?.reels?.showCaptions ?? true}
                          onChange={(val) => handleUpdateSettings('reels', { showCaptions: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Allow Others to Remix"
                      description="Permit creators to use your audio or video in duets/remixes"
                      control={
                        <SettingSelect
                          value={settings?.reels?.allowRemix || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) => handleUpdateSettings('reels', { allowRemix: val })}
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 10: LIVE (Section 12)
              ======================================================== */}
              {activeCategory === 'live' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Live Streaming Preferences"
                    description="Real-time WebRTC broadcast permissions and chat filters"
                    icon={Radio}
                  >
                    <SettingRow
                      title="Live Visibility Default"
                      description="Who is notified when you start a live video broadcast"
                      control={
                        <SettingSelect
                          value={settings?.live?.visibility || 'everyone'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'followers', label: 'Followers' },
                            { value: 'connections', label: 'Connections' },
                          ]}
                          onChange={(val) => handleUpdateSettings('live', { visibility: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Allow Live Comments"
                      description="Enable audience messaging in live stream chat"
                      control={
                        <SettingToggle
                          checked={settings?.live?.allowComments ?? true}
                          onChange={(val) => handleUpdateSettings('live', { allowComments: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Slow Mode Chat"
                      description="Rate-limit comment frequency to once every 10 seconds"
                      control={
                        <SettingToggle
                          checked={settings?.live?.slowMode ?? false}
                          onChange={(val) => handleUpdateSettings('live', { slowMode: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Allow Co-Host / Guest Requests"
                      description="Viewers can request to join screen as video guest"
                      control={
                        <SettingToggle
                          checked={settings?.live?.allowGuests ?? true}
                          onChange={(val) => handleUpdateSettings('live', { allowGuests: val })}
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 11: COMMUNITIES & GROUPS (Section 13)
              ======================================================== */}
              {activeCategory === 'communities' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Community & Group Invites"
                    description="Manage invitations, channel alerts, and mention notifications"
                    icon={Users}
                  >
                    <SettingRow
                      title="Group Invite Permission"
                      description="Who can add you to group chats and channels"
                      control={
                        <SettingSelect
                          value={settings?.communities?.groupInvitePermission || 'connections'}
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'connections', label: 'Connections Only' },
                            { value: 'nobody', label: 'Nobody' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('communities', { groupInvitePermission: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Community Post Alerts"
                      description="Receive notifications for pinned community broadcasts"
                      control={
                        <SettingToggle
                          checked={settings?.communities?.communityNotifications ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('communities', { communityNotifications: val })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 12: AI & SMART FEATURES (Section 14)
              ======================================================== */}
              {activeCategory === 'ai' && (
                <div className="space-y-6">
                  <SettingCard
                    title="AI Assistant & Smart Assistance"
                    description="Responsible, transparent AI tools designed to assist without surveillance"
                    icon={Bot}
                  >
                    <SettingRow
                      title="Enable AI Assistant"
                      description="Contextual writing helper, translation, and summaries"
                      control={
                        <SettingToggle
                          checked={settings?.ai?.enabled ?? true}
                          onChange={(val) => handleUpdateSettings('ai', { enabled: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Conversation Summaries"
                      description="Catch up on active group chats with smart bullet summaries"
                      control={
                        <SettingToggle
                          checked={settings?.ai?.conversationSummaries ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('ai', { conversationSummaries: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Suggested Quick Replies"
                      description="Smart chip suggestions for faster response dispatch"
                      control={
                        <SettingToggle
                          checked={settings?.ai?.suggestedReplies ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('ai', { suggestedReplies: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Save AI Interaction History"
                      description="Keep personalized responses in your secure private vault"
                      control={
                        <SettingToggle
                          checked={settings?.ai?.saveAiHistory ?? true}
                          onChange={(val) => handleUpdateSettings('ai', { saveAiHistory: val })}
                        />
                      }
                    />
                    <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Clear AI Data & History
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Permanently delete saved interaction logs and smart memory
                        </p>
                      </div>
                      <button
                        onClick={handleClearAiHistory}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        Clear AI History
                      </button>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 13: APPEARANCE (Section 15)
              ======================================================== */}
              {activeCategory === 'appearance' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Theme & Display Mode"
                    description="Select visual color presentation for the interface"
                    icon={Sun}
                  >
                    <div className="grid grid-cols-3 gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTheme('light');
                          handleUpdateSettings('appearance', { theme: 'light' });
                        }}
                        className={`p-4 rounded-2xl border flex flex-col items-center space-y-2 transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'border-brand-500 bg-brand-500/10 text-brand-600 font-bold'
                            : 'border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card'
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="text-xs">Light</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTheme('dark');
                          handleUpdateSettings('appearance', { theme: 'dark' });
                        }}
                        className={`p-4 rounded-2xl border flex flex-col items-center space-y-2 transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                            : 'border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card'
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="text-xs">Dark</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTheme('system');
                          handleUpdateSettings('appearance', { theme: 'system' });
                        }}
                        className={`p-4 rounded-2xl border flex flex-col items-center space-y-2 transition-all cursor-pointer ${
                          theme === 'system'
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-bold'
                            : 'border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card'
                        }`}
                      >
                        <Compass className="w-5 h-5" />
                        <span className="text-xs">System</span>
                      </button>
                    </div>

                    <SettingRow
                      title="Layout Density"
                      description="Control row spacing and compact padding"
                      control={
                        <SettingSelect
                          value={settings?.appearance?.layoutDensity || 'comfortable'}
                          options={[
                            { value: 'comfortable', label: 'Comfortable' },
                            { value: 'compact', label: 'Compact' },
                          ]}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', { layoutDensity: val })
                          }
                        />
                      }
                    />

                    <SettingRow
                      title="Visual Blur & Glassmorphism Effects"
                      description="Translucent backdrop filters on modals and navigation bars"
                      control={
                        <SettingToggle
                          checked={settings?.appearance?.visualEffects ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('appearance', { visualEffects: val })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 14: ACCESSIBILITY (Section 16)
              ======================================================== */}
              {activeCategory === 'accessibility' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Accessibility & Inclusivity"
                    description="WCAG-compliant controls for motion, contrast, and assistive tech"
                    icon={Eye}
                  >
                    <SettingRow
                      title="Reduce Motion"
                      description="Disable non-essential animations and transitions"
                      control={
                        <SettingToggle
                          checked={settings?.accessibility?.reduceMotion || false}
                          onChange={(val) =>
                            handleUpdateSettings('accessibility', { reduceMotion: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Larger Text"
                      description="Increase base font size throughout the application"
                      control={
                        <SettingToggle
                          checked={settings?.accessibility?.largerText || false}
                          onChange={(val) =>
                            handleUpdateSettings('accessibility', { largerText: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="High Contrast Mode"
                      description="Enhance border visibility and text sharpness"
                      control={
                        <SettingToggle
                          checked={settings?.accessibility?.highContrast || false}
                          onChange={(val) =>
                            handleUpdateSettings('accessibility', { highContrast: val })
                          }
                        />
                      }
                    />
                    <SettingRow
                      title="Always Show Focus Indicators"
                      description="Prominent outlines for keyboard navigation users"
                      control={
                        <SettingToggle
                          checked={settings?.accessibility?.focusIndicators ?? true}
                          onChange={(val) =>
                            handleUpdateSettings('accessibility', { focusIndicators: val })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 15: LANGUAGE & REGION (Section 17)
              ======================================================== */}
              {activeCategory === 'language' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Language & Regional Formats"
                    description="Localization preferences for interface and translations"
                    icon={Globe}
                  >
                    <SettingRow
                      title="App Language"
                      description="Primary language for user interface"
                      control={
                        <SettingSelect
                          value={settings?.language?.appLanguage || 'en'}
                          options={[
                            { value: 'en', label: 'English (US)' },
                            { value: 'es', label: 'Español' },
                            { value: 'fr', label: 'Français' },
                            { value: 'de', label: 'Deutsch' },
                            { value: 'ja', label: '日本語' },
                          ]}
                          onChange={(val) => handleUpdateSettings('language', { appLanguage: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Time Format"
                      description="Display clocks in 12-hour or 24-hour style"
                      control={
                        <SettingSelect
                          value={settings?.language?.timeFormat || '12h'}
                          options={[
                            { value: '12h', label: '12-Hour (e.g. 2:30 PM)' },
                            { value: '24h', label: '24-Hour (e.g. 14:30)' },
                          ]}
                          onChange={(val) => handleUpdateSettings('language', { timeFormat: val })}
                        />
                      }
                    />
                    <SettingRow
                      title="Auto-Translate Messages"
                      description="Instantly translate incoming foreign text"
                      control={
                        <SettingToggle
                          checked={settings?.language?.autoTranslateMessages || false}
                          onChange={(val) =>
                            handleUpdateSettings('language', { autoTranslateMessages: val })
                          }
                        />
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 16: DATA & STORAGE (Section 18)
              ======================================================== */}
              {activeCategory === 'data' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Storage Breakdown"
                    description="Local media and application cache usage"
                    icon={HardDrive}
                    action={
                      <button
                        onClick={handleClearCache}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        Clear Cache
                      </button>
                    }
                  >
                    <div className="py-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Cached Media & Offline Buffers
                        </span>
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {((settings?.data?.cachedMediaBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-dark-card h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              ((settings?.data?.cachedMediaBytes || 0) / (150 * 1024 * 1024)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </SettingCard>

                  <SettingCard
                    title="Data Portability"
                    description="Export a complete, transparent copy of all your data"
                    icon={Download}
                  >
                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Download My Data
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Download a JSON archive of your profile, posts, reels, and settings
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          window.location.href = `${
                            api.defaults.baseURL || 'http://localhost:5000/api'
                          }/users/export-data`;
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center space-x-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 17: CONNECTED APPS (Section 19)
              ======================================================== */}
              {activeCategory === 'connected-apps' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Connected Applications & Services"
                    description="External services with authorized access to your account"
                    icon={Grid}
                  >
                    <div className="divide-y divide-slate-100 dark:divide-dark-border">
                      {settings?.connectedApps?.length > 0 ? (
                        settings.connectedApps.map((app) => (
                          <div
                            key={app.appId}
                            className="py-3.5 flex items-start justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {app.name}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Permissions: {app.permissions?.join(', ')}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Connected {formatDistanceToNow(new Date(app.connectedAt), { addSuffix: true })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRevokeApp(app.appId)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-bold hover:bg-rose-500/10 transition-colors"
                            >
                              Revoke
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          You don't have any third-party connected applications.
                        </div>
                      )}
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 18: DEVICES & SESSIONS (Section 20)
              ======================================================== */}
              {activeCategory === 'devices' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Active Login Sessions"
                    description="Hardware devices where your account is currently signed in"
                    icon={Smartphone}
                    action={
                      <button
                        onClick={handleLogoutAllSessions}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold hover:bg-rose-500/20 transition-colors"
                      >
                        Log Out Others
                      </button>
                    }
                  >
                    <div className="divide-y divide-slate-100 dark:divide-dark-border">
                      {sessions.length > 0 ? (
                        sessions.map((sess, idx) => (
                          <div key={sess._id || idx} className="py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card text-brand-500">
                                <Globe className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  {sess.device || 'Desktop'} • {sess.browser || 'Chrome / Edge'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {sess.ip || '127.0.0.1'} •{' '}
                                  {sess.lastActive
                                    ? `Active ${formatDistanceToNow(new Date(sess.lastActive), {
                                        addSuffix: true,
                                      })}`
                                    : 'Active now'}
                                </p>
                              </div>
                            </div>
                            {idx === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Other</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-3 text-xs text-slate-500">
                          Current device session active now.
                        </div>
                      )}
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 19: CREATOR TOOLS (Section 21)
              ======================================================== */}
              {activeCategory === 'creator' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Creator Studio & Monetization"
                    description="Professional tools, reach insights, and content defaults"
                    icon={BarChart3}
                  >
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-600/10 to-indigo-600/10 border border-brand-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Creator Dashboard
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          View real metrics for impressions, reach, followers, and engagement
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/creator-dashboard')}
                        className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow-xs flex items-center space-x-1"
                      >
                        <span>Open Studio</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 20: SAFETY CENTER (Section 22)
              ======================================================== */}
              {activeCategory === 'safety' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Safety & Moderation Hub"
                    description="Manage blocked accounts, muted creators, and custom word filters"
                    icon={ShieldCheck}
                  >
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Dedicated Safety Center
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Configure blocked words, view submitted report statuses, and adjust limits
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/safety')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs flex items-center space-x-1"
                      >
                        <span>Open Safety Center</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 21: HELP & SUPPORT (Section 23)
              ======================================================== */}
              {activeCategory === 'help' && (
                <div className="space-y-6">
                  <SettingCard
                    title="Help & User Support"
                    description="Documentation, community guidelines, and technical assistance"
                    icon={HelpCircle}
                  >
                    <SettingRow
                      title="Community Guidelines"
                      description="Standards regarding respect, content moderation, and safety"
                      control={
                        <button
                          onClick={() => navigate('/community-guidelines')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Read</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      }
                    />
                    <SettingRow
                      title="Terms of Service"
                      description="User agreements and acceptable use policies"
                      control={
                        <button
                          onClick={() => navigate('/terms')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      }
                    />
                    <SettingRow
                      title="Contact Support"
                      description="Direct technical assistance and feedback submission"
                      control={
                        <button
                          onClick={() => navigate('/contact')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Contact</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      }
                    />
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 22: ABOUT CHATFLOW (Section 24)
              ======================================================== */}
              {activeCategory === 'about' && (
                <div className="space-y-6">
                  <SettingCard
                    title="About ChatFlow"
                    description="Platform architecture, release build, and licenses"
                    icon={Info}
                  >
                    <div className="p-4 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        ChatFlow Platform
                      </h3>
                      <p className="text-xs text-slate-500">
                        Version 2.4.0 (Production Build #1789)
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed pt-1">
                        A safe, modern and human-centered place to connect, chat, share moments and
                        discover people.
                      </p>
                    </div>
                  </SettingCard>
                </div>
              )}

              {/* ========================================================
                  CATEGORY 23: ACCOUNT MANAGEMENT (Section 25)
              ======================================================== */}
              {activeCategory === 'account-management' && (
                <div className="space-y-6">
                  {/* Deactivate Card */}
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Power className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        Deactivate Account
                      </h3>
                    </div>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Temporarily hide your profile, posts, and stories. You can reactivate your
                      account whenever you are ready by logging back in.
                    </p>
                    <button
                      onClick={() => setDeactivateModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      Deactivate Account
                    </button>
                  </div>

                  {/* Danger Zone: Delete Account */}
                  <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                        Danger Zone: Delete Account
                      </h3>
                    </div>
                    <p className="text-xs text-rose-600/80 dark:text-rose-300/80 leading-relaxed">
                      Permanently remove your account and all associated messages, posts, reels,
                      stories, and connections. This action cannot be reversed.
                    </p>
                    <button
                      onClick={() => {
                        setDeletePassword('');
                        setDeleteModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Interactive Modals */}
      <PrivacyCheckupModal
        isOpen={privacyCheckupOpen}
        onClose={() => setPrivacyCheckupOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <SecurityCheckupModal
        isOpen={securityCheckupOpen}
        onClose={() => setSecurityCheckupOpen(false)}
        settings={settings}
        sessions={sessions}
        onOpen2FA={() => setTwoFactorModalOpen(true)}
        onOpenPasswordChange={() => selectCategory('security')}
        onOpenSessions={() => selectCategory('devices')}
      />

      <TwoFactorSetupModal
        isOpen={twoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
        is2FAEnabled={settings?.security?.twoFactorEnabled || false}
        on2FAUpdated={(enabled, codes) => {
          setSettings((prev) => ({
            ...prev,
            security: {
              ...prev?.security,
              twoFactorEnabled: enabled,
              backupRecoveryCodes: codes.map((c) => ({ code: c, used: false })),
            },
          }));
        }}
      />

      <DeactivateModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onDeactivated={async () => {
          await logout();
          navigate('/welcome');
        }}
      />

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Permanently Delete Account?
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted leading-relaxed">
                This action is permanent and cannot be undone. Enter your password to proceed.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
