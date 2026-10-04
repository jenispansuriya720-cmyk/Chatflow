import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const CreateGroupPage = () => {
  const { user } = useAuth();
  const { fetchConversations, selectConversation } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get('/users');
        if (res.data.success) {
          setAvailableUsers(res.data.users);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadUsers();
  }, []);

  const handleToggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRandomAvatar = () => {
    const seed = groupName || Date.now();
    setGroupImage(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      addToast('Group name is required', 'error');
      return;
    }
    if (selectedMembers.length === 0) {
      addToast('Please select at least 1 other member', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/conversations/group', {
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        groupImage: groupImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`,
        participants: selectedMembers,
      });

      if (res.data.success) {
        addToast(`Group "${groupName}" created!`, 'success');
        await fetchConversations();
        selectConversation(res.data.conversation._id);
        navigate(`/chat/${res.data.conversation._id}`);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create group', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 min-w-0">
        <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-8">
          {/* Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-dark-border">
            <button
              onClick={() => navigate('/chats')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create New Group
              </h1>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Bring multiple collaborators together for team discussions
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-6">
            {/* Group details card */}
            <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar
                  src={
                    groupImage ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${groupName || 'group'}`
                  }
                  name={groupName || 'Group'}
                  size="xl"
                  className="ring-2 ring-brand-500/30 flex-shrink-0"
                />
                <button
                  type="button"
                  onClick={handleRandomAvatar}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Generate Icon
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Design System Team"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Group Description
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Purpose, agenda, or channel topics..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* Member selection card */}
            <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-muted">
                  Select Members ({selectedMembers.length} selected)
                </h3>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {availableUsers.map((u) => {
                  const isSelected = selectedMembers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => handleToggleMember(u._id)}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-dark-hover border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar
                          src={u.profilePicture}
                          name={u.fullName || u.username}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'border-slate-300 dark:border-dark-border'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedMembers.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Create Group'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupPage;
