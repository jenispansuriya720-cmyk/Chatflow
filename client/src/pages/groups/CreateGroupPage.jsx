import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles, Check, ArrowRight, ArrowLeft, Camera, Loader2 } from 'lucide-react';
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
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get('/users?limit=50');
        if (res.data.success) {
          const realUsers = (res.data.users || []).filter(
            (u) => (u._id || u.id)?.toString() !== user?._id?.toString()
          );
          setAvailableUsers(realUsers);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadUsers();
  }, [user?._id]);

  const handleToggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRandomAvatar = () => {
    const seed = `${groupName || 'group'}_${Math.random().toString(36).substring(2, 7)}`;
    setGroupImage(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('media', file);
      formData.append('entityType', 'group');

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.url) {
        setGroupImage(res.data.url);
        addToast('Group avatar uploaded!', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
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
                <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                  <Avatar
                    src={
                      groupImage ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${groupName || 'group'}`
                    }
                    name={groupName || 'Group'}
                    size="xl"
                    className="ring-2 ring-brand-500/30 flex-shrink-0"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 hover:bg-brand-700 text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-dark-surface transition-transform active:scale-90">
                    {uploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="px-3 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-colors text-left"
                  >
                    Use Random Icon
                  </button>
                </div>
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
