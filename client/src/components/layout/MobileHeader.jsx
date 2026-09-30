import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import api from '../../services/api';

const MobileHeader = ({ title, rightAction }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        if (isMounted && res.data?.success) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // Silently handle if unauthenticated
      }
    };
    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-slate-200 dark:border-dark-border flex items-center justify-between px-3.5 z-40 select-none transition-colors">
      {/* Brand or Page Title */}
      <div
        onClick={() => navigate('/home')}
        className="flex items-center space-x-2 cursor-pointer touch-target py-1 -ml-1.5"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-base font-black tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
          {title || 'ChatFlow'}
        </span>
      </div>

      {/* Right Controls: Search, Notifications, Avatar / Custom Action */}
      <div className="flex items-center space-x-1 -mr-1">
        {rightAction ? (
          rightAction
        ) : (
          <>
            <button
              onClick={() => navigate('/explore')}
              className="touch-target text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white rounded-xl active:scale-95 transition-transform"
              aria-label="Search and Explore"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/notifications')}
              className="relative touch-target text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white rounded-xl active:scale-95 transition-transform"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="touch-target ml-0.5 active:scale-95 transition-transform"
              aria-label="My Profile"
            >
              <Avatar
                src={user?.profilePicture}
                name={user?.fullName || user?.username}
                size="xs"
                status="online"
                className="flex-shrink-0"
              />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
