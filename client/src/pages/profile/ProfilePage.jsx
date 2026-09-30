import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Lock, Save, Camera, Sparkles, Upload, Trash2 } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import AvatarCropModal from '../../components/modals/AvatarCropModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    profilePicture: user?.profilePicture || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [avatarDeleteModalOpen, setAvatarDeleteModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleRemoveAvatar = async () => {
    try {
      const res = await api.delete('/users/profile-picture');
      if (res.data?.success) {
        setFormData((prev) => ({ ...prev, profilePicture: '' }));
        updateUser({ ...user, profilePicture: '' });
        addToast('Profile picture removed successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove profile picture', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file (PNG, JPG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProfileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleGenerateNewAvatar = () => {
    const seed = Date.now();
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setFormData((prev) => ({ ...prev, profilePicture: avatar }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const res = await api.put('/users/profile', formData);
      if (res.data.success) {
        updateUser(res.data.user);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await api.put('/users/change-password', passwordData);
      if (res.data.success) {
        addToast('Password changed successfully!', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-8">
          {/* Header */}
          <div className="pb-4 border-b border-slate-200 dark:border-dark-border">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Profile
            </h1>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Manage your personal information, avatar, and security
            </p>
          </div>

          {/* Profile Details Form */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b border-slate-100 dark:border-dark-border">
              <Avatar
                src={formData.profilePicture}
                name={formData.fullName || formData.username}
                size="profile"
                status="online"
                priority={true}
              />
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {formData.fullName || 'Your Name'}
                </h3>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                  @{formData.username}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Crop</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateNewAvatar}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-500" />
                    <span>Randomize Avatar</span>
                  </button>
                  {Boolean(formData.profilePicture) && (
                    <button
                      type="button"
                      onClick={() => setAvatarDeleteModalOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleProfileChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleProfileChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-500 opacity-70 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleProfileChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-full space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleProfileChange}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdatingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>

          {/* Change Password Card */}
          <form
            onSubmit={handleSavePassword}
            className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-xs space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Change Password
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* 1:1 Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={Boolean(cropImageSrc)}
        imageSrc={cropImageSrc}
        onClose={() => setCropImageSrc(null)}
        onSave={(croppedDataUrl) => {
          setFormData((prev) => ({ ...prev, profilePicture: croppedDataUrl }));
          addToast('Profile picture cropped! Click Save Profile to apply.', 'info');
        }}
      />

      {/* Remove Profile Picture Confirm Modal */}
      <DeleteConfirmModal
        isOpen={avatarDeleteModalOpen}
        onClose={() => setAvatarDeleteModalOpen(false)}
        onConfirm={handleRemoveAvatar}
        title="Remove Profile Picture?"
        description="Are you sure you want to remove your profile picture? Your profile will display your initials until you upload a new photo."
      />
    </div>
  );
};

export default ProfilePage;
