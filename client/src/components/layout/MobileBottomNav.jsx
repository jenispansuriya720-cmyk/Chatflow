import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Plus, Compass, User } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

const MobileBottomNav = ({ onOpenCreate }) => {
  const location = useLocation();
  const { conversations } = useChat();
  const { user } = useAuth();

  const totalUnread = (conversations || []).reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  const isHomeActive = location.pathname === '/home' || location.pathname === '/';
  const isMessagesActive = location.pathname.startsWith('/chats') || location.pathname.startsWith('/chat/');
  const isExploreActive = location.pathname.startsWith('/explore');
  const isProfileActive = location.pathname === '/profile' || location.pathname === `/profile/${user?._id}`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-t border-slate-200 dark:border-dark-border flex items-center justify-around px-1 select-none transition-colors"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        height: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
      }}
      role="navigation"
      aria-label="Mobile Navigation"
    >
      {/* 1. Home */}
      <NavLink
        to="/home"
        className="flex flex-col items-center justify-center flex-1 touch-target py-1 transition-colors"
        aria-label="Home"
      >
        <Home
          className={`w-5 h-5 transition-transform active:scale-90 ${
            isHomeActive
              ? 'text-brand-600 dark:text-brand-400 stroke-[2.5]'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        />
        <span
          className={`text-[10px] mt-0.5 font-medium ${
            isHomeActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        >
          Home
        </span>
      </NavLink>

      {/* 2. Messages */}
      <NavLink
        to="/chats"
        className="flex flex-col items-center justify-center flex-1 touch-target py-1 relative transition-colors"
        aria-label="Messages"
      >
        <div className="relative">
          <MessageSquare
            className={`w-5 h-5 transition-transform active:scale-90 ${
              isMessagesActive
                ? 'text-brand-600 dark:text-brand-400 stroke-[2.5]'
                : 'text-slate-400 dark:text-dark-muted'
            }`}
          />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-brand-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] mt-0.5 font-medium ${
            isMessagesActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        >
          Messages
        </span>
      </NavLink>

      {/* 3. Create (Primary Center Action) */}
      <div className="flex flex-col items-center justify-center flex-1 py-1">
        <button
          onClick={onOpenCreate}
          className="w-11 h-11 -mt-2 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/35 active:scale-90 transition-transform"
          aria-label="Create Post, Reel, or Story"
          title="Create"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* 4. Explore */}
      <NavLink
        to="/explore"
        className="flex flex-col items-center justify-center flex-1 touch-target py-1 transition-colors"
        aria-label="Explore"
      >
        <Compass
          className={`w-5 h-5 transition-transform active:scale-90 ${
            isExploreActive
              ? 'text-brand-600 dark:text-brand-400 stroke-[2.5]'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        />
        <span
          className={`text-[10px] mt-0.5 font-medium ${
            isExploreActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        >
          Explore
        </span>
      </NavLink>

      {/* 5. Profile */}
      <NavLink
        to="/profile"
        className="flex flex-col items-center justify-center flex-1 touch-target py-1 transition-colors"
        aria-label="My Profile"
      >
        <div className={`p-0.5 rounded-full transition-transform active:scale-90 ${isProfileActive ? 'ring-2 ring-brand-500' : ''}`}>
          <Avatar
            src={user?.profilePicture}
            name={user?.fullName || user?.username}
            size="xs"
            status="online"
            className="flex-shrink-0 pointer-events-none"
          />
        </div>
        <span
          className={`text-[10px] mt-0.5 font-medium ${
            isProfileActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-400 dark:text-dark-muted'
          }`}
        >
          Profile
        </span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNav;
