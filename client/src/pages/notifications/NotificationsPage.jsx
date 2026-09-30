import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Heart,
  AtSign,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useToast } from '../../components/common/Toast';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { addToast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for live real-time notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      addToast(notif.message, 'info');
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, addToast]);

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      if (notification.type === 'follow_request' || notification.type === 'follow') {
        const senderId = notification.sender?._id || notification.sender;
        if (senderId) navigate(`/profile/${senderId}`);
      } else if (notification.conversationId) {
        navigate(`/chat/${notification.conversationId}`);
      } else if (notification.postId) {
        navigate('/home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async (e, notif) => {
    e.stopPropagation();
    const senderId = notif.sender?._id || notif.sender;
    if (!senderId) return;

    try {
      setActionLoadingId(notif._id);
      const endpoint =
        notif.type === 'connection_request'
          ? `/connections/${senderId}/accept`
          : `/follow/${senderId}/accept`;
      const res = await api.post(endpoint);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notif._id ? { ...n, actionStatus: 'accepted', isRead: true } : n
          )
        );
        addToast(
          notif.type === 'connection_request'
            ? `Connected with ${notif.sender?.fullName || 'user'}`
            : `Accepted ${notif.sender?.fullName || 'user'}'s follow request`,
          'success'
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (e, notif) => {
    e.stopPropagation();
    const senderId = notif.sender?._id || notif.sender;
    if (!senderId) return;

    try {
      setActionLoadingId(notif._id);
      const endpoint =
        notif.type === 'connection_request'
          ? `/connections/${senderId}/reject`
          : `/follow/${senderId}/reject`;
      const res = await api.post(endpoint);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notif._id ? { ...n, actionStatus: 'rejected', isRead: true } : n
          )
        );
        addToast(
          notif.type === 'connection_request'
            ? 'Declined connection request'
            : 'Declined follow request',
          'info'
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'connection_request':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'connection_accept':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'follow_request':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'follow':
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'follow_accept':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'like':
      case 'reaction':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-amber-500" />;
      case 'group_invite':
        return <Users className="w-4 h-4 text-purple-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-brand-500" />;
    }
  };

  return (
    <div className="flex h-screen h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto pt-16 md:pt-8 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-dark-border">
            <div className="flex items-center space-x-2">
              <Bell className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="space-y-2.5">
            {notifications.map((notif) => {
              const isFollowRequest = notif.type === 'follow_request';
              const actionStatus = notif.actionStatus || 'pending';

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${
                    notif.isRead
                      ? 'bg-white dark:bg-dark-surface border-slate-200/80 dark:border-dark-border opacity-90'
                      : 'bg-brand-500/5 dark:bg-brand-500/10 border-brand-500/20 shadow-xs ring-1 ring-brand-500/10'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const sId = notif.sender?._id || notif.sender;
                        if (sId) navigate(`/profile/${sId}`);
                      }}
                      className="relative flex-shrink-0 cursor-pointer"
                    >
                      <Avatar
                        src={notif.sender?.profilePicture}
                        name={notif.sender?.fullName || 'User'}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-dark-surface rounded-full shadow-xs">
                        {getIcon(notif.type)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        <strong className="font-bold text-slate-900 dark:text-white mr-1">
                          {notif.sender?.fullName || 'Someone'}
                        </strong>
                        {notif.message.replace(notif.sender?.fullName || '', '').trim()}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 block">
                        {notif.createdAt
                          ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                          : 'just now'}
                      </span>
                    </div>
                  </div>

                  {/* Right Action: Follow/Connection Request Accept/Decline or Read Dot */}
                  <div className="flex items-center space-x-2 pl-12 sm:pl-0 flex-shrink-0">
                    {(notif.type === 'follow_request' || notif.type === 'connection_request') &&
                    actionStatus === 'pending' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={actionLoadingId === notif._id}
                          onClick={(e) => handleAcceptRequest(e, notif)}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          disabled={actionLoadingId === notif._id}
                          onClick={(e) => handleRejectRequest(e, notif)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card text-xs font-semibold disabled:opacity-50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (notif.type === 'follow_request' || notif.type === 'connection_request') &&
                      actionStatus === 'accepted' ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        Accepted
                      </span>
                    ) : (notif.type === 'follow_request' || notif.type === 'connection_request') &&
                      actionStatus === 'rejected' ? (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-dark-card px-2.5 py-1 rounded-full">
                        Declined
                      </span>
                    ) : !notif.isRead ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-600 flex-shrink-0" />
                    ) : null}
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center p-12 text-center select-none bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl">
                <Bell className="w-12 h-12 text-slate-300 dark:text-dark-muted mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  All caught up!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  You have no new notifications right now.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
