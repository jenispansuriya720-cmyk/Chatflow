import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  MessageSquare,
  Ban,
  Unlock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const ContactsPage = () => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const { startDirectChat } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'online' | 'blocked'
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStartChat = async (targetUserId) => {
    try {
      const conv = await startDirectChat(targetUserId);
      navigate(`/chat/${conv._id}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Cannot start chat with this user.', 'error');
    }
  };

  const handleToggleBlock = async (targetUser) => {
    const isBlocked = user?.blockedUsers?.includes(targetUser._id);
    try {
      if (isBlocked) {
        await api.post(`/users/${targetUser._id}/unblock`);
        addToast(`Unblocked ${targetUser.fullName}`, 'success');
        user.blockedUsers = user.blockedUsers.filter((id) => id !== targetUser._id);
      } else {
        await api.post(`/users/${targetUser._id}/block`);
        addToast(`Blocked ${targetUser.fullName}`, 'info');
        if (!user.blockedUsers) user.blockedUsers = [];
        user.blockedUsers.push(targetUser._id);
      }
      fetchUsers();
    } catch (err) {
      addToast('Operation failed', 'error');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const isBlocked = user?.blockedUsers?.includes(u._id);

    if (activeTab === 'blocked' && !isBlocked) return false;
    if (activeTab === 'online' && !isUserOnline(u._id)) return false;
    if (activeTab === 'all' && isBlocked) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Contacts Directory
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                Discover teammates, check presence status, and start one-on-one chats
              </p>
            </div>

            {/* Search & Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-100 dark:bg-dark-card border border-transparent focus:border-brand-500 rounded-xl text-xs focus:outline-none w-full sm:w-64 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex bg-slate-100 dark:bg-dark-card p-1 rounded-xl">
                {['all', 'online', 'blocked'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-500 dark:text-dark-muted hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User cards grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-6">
            {filteredUsers.map((u) => {
              const online = isUserOnline(u._id);
              const isBlocked = user?.blockedUsers?.includes(u._id);

              return (
                <div
                  key={u._id}
                  className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start space-x-3.5">
                    <Avatar
                      src={u.profilePicture}
                      name={u.fullName || u.username}
                      size="lg"
                      status={online ? 'online' : 'offline'}
                      className="flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {u.fullName}
                        </h3>
                        {online && (
                          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-600 dark:text-brand-400 font-medium truncate">
                        @{u.username}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dark-muted line-clamp-2 mt-1.5 leading-relaxed">
                        {u.bio || 'Available for collaboration.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-dark-border">
                    <button
                      onClick={() => handleStartChat(u._id)}
                      className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>

                    <button
                      onClick={() => handleToggleBlock(u)}
                      className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                        isBlocked
                          ? 'bg-slate-100 dark:bg-dark-hover text-emerald-500 hover:bg-emerald-500/10'
                          : 'bg-slate-100 dark:bg-dark-hover text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'
                      }`}
                      title={isBlocked ? 'Unblock user' : 'Block user'}
                    >
                      {isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 dark:text-dark-muted mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No contacts found
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search criteria or filter tabs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
