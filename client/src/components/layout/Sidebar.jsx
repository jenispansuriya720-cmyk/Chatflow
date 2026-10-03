import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Film,
  Radio,
  Plus,
  Phone,
  Users,
  Bell,
  Bookmark,
  Settings,
  Shield,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import CreateModal from '../modals/CreateModal';
import CreateStoryModal from '../social/CreateStoryModal';
import CreatePostModal from '../social/CreatePostModal';
import CreateReelModal from '../social/CreateReelModal';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

const Sidebar = ({
  onOpenCreatePost,
  onOpenCreateStory,
  onOpenCreateReel,
  hideMobileHeader = false,
  hideMobileNav = false,
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { conversations } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [localCreateStoryOpen, setLocalCreateStoryOpen] = useState(false);
  const [localCreatePostOpen, setLocalCreatePostOpen] = useState(false);
  const [localCreateReelOpen, setLocalCreateReelOpen] = useState(false);

  const handleOpenCreateStory = () => {
    setCreateModalOpen(false);
    if (onOpenCreateStory) {
      onOpenCreateStory();
    } else {
      setLocalCreateStoryOpen(true);
    }
  };

  const handleOpenCreatePost = () => {
    setCreateModalOpen(false);
    if (onOpenCreatePost) {
      onOpenCreatePost();
    } else {
      setLocalCreatePostOpen(true);
    }
  };

  const handleOpenCreateReel = () => {
    setCreateModalOpen(false);
    if (onOpenCreateReel) {
      onOpenCreateReel();
    } else {
      setLocalCreateReelOpen(true);
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Section 8 Desktop Navigation Structure
  const topNavItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/chats', icon: MessageSquare, label: 'Messages', badge: totalUnread > 0 ? totalUnread : null },
    { to: '/reels', icon: Film, label: 'Reels' },
    { to: '/live', icon: Radio, label: 'Live', isLive: true },
  ];

  const middleNavItems = [
    { to: '/calls', icon: Phone, label: 'Calls' },
    { to: '/people', icon: Users, label: 'People' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const savedNavItems = [
    { to: '/saved', icon: Bookmark, label: 'Saved' },
  ];

  const bottomNavItems = [
    { to: '/creator-dashboard', icon: BarChart3, label: 'Creator Studio' },
    { to: '/safety', icon: Shield, label: 'Safety Center' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive =
      location.pathname === item.to ||
      (item.to === '/home' && location.pathname === '/') ||
      (item.to === '/chats' && (location.pathname.startsWith('/chat/') || location.pathname.startsWith('/messages') || location.pathname === '/chats')) ||
      (item.to === '/live' && location.pathname.startsWith('/live'));

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group ${
          isActive
            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold shadow-xs'
            : 'text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover'
        }`}
        title={item.label}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />

        {item.isLive && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
        )}

        {item.badge && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}

        {/* Desktop Tooltip */}
        <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
          {item.label}
        </span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Desktop & Tablet Left Sidebar (Section 8) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 py-5 bg-white dark:bg-dark-surface border-r border-slate-200 dark:border-dark-border z-30 flex-shrink-0 transition-colors duration-200 select-none">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-1.5">
          <div
            onClick={() => navigate('/home')}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
            title="ChatFlow"
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-brand-600 dark:text-brand-400">
            ChatFlow
          </span>
        </div>

        {/* Navigation Groups */}
        <nav className="flex flex-col items-center space-y-2 w-full px-3 overflow-y-auto no-scrollbar py-2">
          {/* Top Group: Home, Messages, Reels, Create (+), Live */}
          {topNavItems.slice(0, 3).map(renderNavLink)}

          {/* Quick Create (+) Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCreateModalOpen((prev) => !prev);
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 group relative select-none cursor-pointer touch-manipulation z-20"
            title="Create Story, Post, or Reel"
            aria-label="Create content"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Create
            </span>
          </button>

          {topNavItems.slice(3).map(renderNavLink)}

          {/* Section Divider */}
          <div className="w-6 h-px bg-slate-200 dark:bg-dark-border my-1" />

          {/* Middle Group: People, Notifications */}
          {middleNavItems.map(renderNavLink)}

          {/* Section Divider */}
          <div className="w-6 h-px bg-slate-200 dark:bg-dark-border my-1" />

          {/* Saved Group */}
          {savedNavItems.map(renderNavLink)}

          {/* Section Divider */}
          <div className="w-6 h-px bg-slate-200 dark:bg-dark-border my-1" />

          {/* Bottom Tools: Studio, Safety, Settings */}
          {bottomNavItems.map(renderNavLink)}
        </nav>

        {/* Bottom Profile & Theme Actions */}
        <div className="flex flex-col items-center space-y-2.5 pt-2 border-t border-slate-100 dark:border-dark-border w-full">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="group relative cursor-pointer"
            title="My Profile"
          >
            <Avatar
              src={user?.profilePicture}
              name={user?.fullName || user?.username}
              size="sm"
              status="online"
              className="flex-shrink-0"
            />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      {!hideMobileHeader && <MobileHeader />}

      {/* Mobile Fixed Bottom Navigation Bar (5 Canonical Items: Home, Messages, Create, Explore, Profile) */}
      {!hideMobileNav && (
        <MobileBottomNav
          onOpenCreate={(e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            setCreateModalOpen((prev) => !prev);
          }}
        />
      )}

      {/* Global Content Creation Hub Modal */}
      <CreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOpenCreateStory={handleOpenCreateStory}
        onOpenCreatePost={handleOpenCreatePost}
        onOpenCreateReel={handleOpenCreateReel}
      />

      {/* Creation modals rendered when not delegated to parent */}
      {!onOpenCreateStory && (
        <CreateStoryModal
          isOpen={localCreateStoryOpen}
          onClose={() => setLocalCreateStoryOpen(false)}
          onStoryCreated={(story) => {
            window.dispatchEvent(new CustomEvent('chatflow:story-created', { detail: story }));
          }}
        />
      )}

      {!onOpenCreatePost && (
        <CreatePostModal
          isOpen={localCreatePostOpen}
          onClose={() => setLocalCreatePostOpen(false)}
          onPostCreated={(post) => {
            window.dispatchEvent(new CustomEvent('chatflow:post-created', { detail: post }));
          }}
        />
      )}

      {!onOpenCreateReel && (
        <CreateReelModal
          isOpen={localCreateReelOpen}
          onClose={() => setLocalCreateReelOpen(false)}
          onReelCreated={(reel) => {
            window.dispatchEvent(new CustomEvent('chatflow:reel-created', { detail: reel }));
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
