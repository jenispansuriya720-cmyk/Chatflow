import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  Search,
  Check,
  Camera,
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../common/Toast';
import api from '../../services/api';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useAuth();
  const { fetchConversations, selectConversation } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Load real authenticated users when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await api.get('/users?limit=50');
        if (isMounted && res.data?.success) {
          // Exclude logged in user
          const realUsers = (res.data.users || []).filter(
            (u) => (u._id || u.id)?.toString() !== user?._id?.toString()
          );
          setUsers(realUsers);
        }
      } catch (err) {
        console.error('Failed to load users for group creation:', err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    fetchUsers();

    // Reset state
    setGroupName('');
    setGroupDescription('');
    setGroupImage('');
    setSelectedMembers([]);
    setSearchQuery('');
    setErrorMessage('');

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?._id]);

  if (!isOpen) return null;

  // Toggle member selection
  const handleToggleMember = (targetUser) => {
    const targetId = targetUser._id || targetUser.id;
    setSelectedMembers((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId]
    );
    if (errorMessage) setErrorMessage('');
  };

  // Upload custom group avatar photo
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size must be less than 10MB', 'error');
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
      } else {
        throw new Error('Upload response missing URL');
      }
    } catch (err) {
      console.error('Group avatar upload error:', err);
      addToast('Failed to upload image. Using default avatar.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Generate random Dicebear avatar seed
  const handleGenerateRandomAvatar = () => {
    const seed = `${groupName.trim() || 'group'}_${Math.random().toString(36).substring(2, 7)}`;
    setGroupImage(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`);
  };

  // Submit and create group
  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Group name is required.');
      return;
    }

    if (trimmedName.length > 60) {
      setErrorMessage('Group name cannot exceed 60 characters.');
      return;
    }

    if (selectedMembers.length === 0) {
      setErrorMessage('Please select at least 1 other member to create a group.');
      return;
    }

    try {
      setSubmitting(true);

      const finalAvatar =
        groupImage ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(trimmedName)}`;

      const res = await api.post('/conversations/group', {
        groupName: trimmedName,
        groupDescription: groupDescription.trim(),
        groupImage: finalAvatar,
        participants: selectedMembers,
      });

      if (res.data?.success && res.data?.conversation) {
        const newConversation = res.data.conversation;
        addToast(`Group "${trimmedName}" created!`, 'success');

        // Refresh conversations list & select new group
        await fetchConversations();
        selectConversation(newConversation._id);

        if (onGroupCreated) {
          onGroupCreated(newConversation);
        }

        onClose();
        navigate(`/chat/${newConversation._id}`);
      } else {
        throw new Error(res.data?.message || 'Group creation failed');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      const msg =
        err.response?.data?.message ||
        'Unable to create group. Please check your connection and try again.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  // Selected member objects
  const selectedMemberObjects = users.filter((u) =>
    selectedMembers.includes(u._id || u.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Create Group"
    >
      <div
        className="w-full sm:max-w-md md:max-w-lg bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-dark-border flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-dark-border rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              aria-label="Close"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Create Group
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Add members and start collaborating
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Group Avatar Section */}
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar
                src={
                  groupImage ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                    groupName.trim() || 'group'
                  )}`
                }
                name={groupName || 'Group'}
                size="xl"
                className="w-20 h-20 rounded-full ring-4 ring-brand-500/20 shadow-md object-cover"
              />

              {/* Upload Overlay Badge */}
              <div
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change Avatar"
              >
                <Camera className="w-6 h-6" />
              </div>

              {/* Camera Icon Button */}
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 hover:bg-brand-700 text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-dark-surface transition-transform active:scale-90"
                aria-label="Upload photo"
              >
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {/* Random generator action */}
            <button
              type="button"
              onClick={handleGenerateRandomAvatar}
              className="mt-2 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Generate Default Avatar</span>
            </button>
          </div>

          {/* Group Name Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {groupName.length}/60
              </span>
            </div>
            <input
              type="text"
              value={groupName}
              maxLength={60}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter group name..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400 font-medium transition-all"
              required
            />
          </div>

          {/* Group Description Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={groupDescription}
              maxLength={120}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Group purpose or topics..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Selected Members Chips */}
          {selectedMemberObjects.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wider">
                Selected ({selectedMemberObjects.length})
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
                {selectedMemberObjects.map((m) => {
                  const mId = m._id || m.id;
                  return (
                    <div
                      key={mId}
                      className="flex items-center space-x-1.5 pl-1.5 pr-2 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex-shrink-0 animate-scaleIn"
                    >
                      <Avatar
                        src={m.profilePicture}
                        name={m.fullName || m.username}
                        size="xs"
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="max-w-[90px] truncate font-medium">
                        {m.fullName?.split(' ')[0] || m.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleMember(m)}
                        className="text-brand-600 dark:text-brand-400 hover:text-rose-500 p-0.5 rounded-full"
                        aria-label={`Remove ${m.fullName || m.username}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Members Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add Members <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedMembers.length} selected
              </span>
            </div>

            {/* User Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real contacts..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
              />
            </div>

            {/* Real Authenticated Users List */}
            <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1 rounded-2xl border border-slate-100 dark:border-dark-border/60 p-1 bg-slate-50/50 dark:bg-dark-card/30">
              {loadingUsers ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  <span className="text-xs">Loading users...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const uId = u._id || u.id;
                  const isSelected = selectedMembers.includes(uId);
                  return (
                    <div
                      key={uId}
                      onClick={() => handleToggleMember(u)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-dark-hover border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar
                          src={u.profilePicture}
                          name={u.fullName || u.username}
                          size="sm"
                          status={u.isOnline ? 'online' : undefined}
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

                      {/* Checkmark circle */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  {searchQuery ? 'No users matching search' : 'No available contacts'}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-1">
            <button
              type="submit"
              disabled={submitting || !groupName.trim() || selectedMembers.length === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>
                    Create Group ({selectedMembers.length + 1} members)
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
