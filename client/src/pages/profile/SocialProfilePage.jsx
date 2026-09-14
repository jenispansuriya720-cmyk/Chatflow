import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Film,
  Bookmark,
  Heart,
  MessageSquare,
  Share2,
  Edit3,
  UserCheck,
  UserPlus,
  Send,
  Camera,
  Sparkles,
  Link as LinkIcon,
  Play,
  Settings,
  X,
  Check,
  Lock,
  Clock,
  Phone,
  Video,
  Radio,
  Upload,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import AvatarCropModal from '../../components/modals/AvatarCropModal';
import PostCard from '../../components/social/PostCard';
import CommentsModal from '../../components/social/CommentsModal';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const SocialProfilePage = () => {
  const { userId } = useParams();
  const { user: authUser, updateUser } = useAuth();
  const { openDirectChat } = useChat();
  const { startCall } = useCall();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // If no userId in route params, view own profile
  const isOwnProfile = !userId || userId === authUser?._id;
  const targetId = isOwnProfile ? authUser?._id : userId;

  const [profileUser, setProfileUser] = useState(isOwnProfile ? authUser : null);
  const [relationship, setRelationship] = useState('none');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPrivateLocked, setIsPrivateLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'reels', 'saved'
  const [activeUserStream, setActiveUserStream] = useState(null);
  
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: authUser?.fullName || '',
    username: authUser?.username || '',
    bio: authUser?.bio || '',
    profilePicture: authUser?.profilePicture || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarFileSelect = (e) => {
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

  // Followers/Following list modal
  const [followModalTitle, setFollowModalTitle] = useState(null); // 'Followers' | 'Following' | null
  const [followList, setFollowList] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Selected post for detail view
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCommentsPost, setSelectedCommentsPost] = useState(null);

  useEffect(() => {
    if (targetId) {
      loadProfileData();
    }
  }, [targetId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // 1. Fetch User details
      const userRes = await api.get(`/users/${targetId}`);
      if (userRes.data?.user) {
        setProfileUser(userRes.data.user);
      }

      // 2. Check Relationship & Privacy if not own profile
      let canViewPrivate = isOwnProfile;
      if (!isOwnProfile) {
        const relRes = await api.get(`/follow/${targetId}/relationship`);
        if (relRes.data?.success) {
          const rel = relRes.data.relationship;
          setRelationship(rel);
          const isFollow = rel === 'following' || rel === 'mutual';
          setIsFollowing(isFollow);
          canViewPrivate = isFollow;

          if (userRes.data?.user?.isPrivate && !isFollow) {
            setIsPrivateLocked(true);
          } else {
            setIsPrivateLocked(false);
          }
        }
      } else {
        setIsPrivateLocked(false);
      }

      // 3. Fetch Posts if not locked
      if (canViewPrivate || !userRes.data?.user?.isPrivate) {
        const postsRes = await api.get(`/posts/user/${targetId}`);
        if (postsRes.data?.posts) {
          setPosts(postsRes.data.posts);
        }

        // 4. Fetch Reels
        const reelsRes = await api.get(`/reels/user/${targetId}`);
        if (reelsRes.data?.reels) {
          setReels(reelsRes.data.reels);
        }
      } else {
        setPosts([]);
        setReels([]);
      }

      // 5. Fetch Saved (if own profile)
      if (isOwnProfile) {
        const savedRes = await api.get('/posts/saved');
        if (savedRes.data?.posts) {
          setSavedPosts(savedRes.data.posts);
        }
      }

      // 6. Check if target user is currently Live
      try {
        const liveRes = await api.get('/live');
        if (liveRes.data?.streams) {
          const live = liveRes.data.streams.find(
            (s) => (s.host?._id || s.host) === targetId && s.status === 'live'
          );
          setActiveUserStream(live || null);
        }
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load profile data:', err);
      addToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const res = await api.post(`/follow/${targetId}`);
      if (res.data.success) {
        setRelationship(res.data.relationship);
        setIsFollowing(res.data.isFollowing);

        if (res.data.isPending) {
          setIsPrivateLocked(true);
        } else if (res.data.isFollowing) {
          setIsPrivateLocked(false);
          // Reload posts and reels
          const [postsRes, reelsRes] = await Promise.allSettled([
            api.get(`/posts/user/${targetId}`),
            api.get(`/reels/user/${targetId}`),
          ]);
          if (postsRes.status === 'fulfilled' && postsRes.value.data?.posts) {
            setPosts(postsRes.value.data.posts);
          }
          if (reelsRes.status === 'fulfilled' && reelsRes.value.data?.reels) {
            setReels(reelsRes.value.data.reels);
          }
        } else {
          // Unfollowed
          if (profileUser?.isPrivate) {
            setIsPrivateLocked(true);
            setPosts([]);
            setReels([]);
          }
        }

        setProfileUser((prev) => ({
          ...prev,
          followersCount: res.data.isFollowing
            ? (prev?.followersCount || 0) + 1
            : res.data.isPending
            ? prev?.followersCount || 0
            : Math.max(0, (prev?.followersCount || 1) - 1),
        }));
        addToast(res.data.message, 'success');
      }
    } catch (err) {
      addToast('Failed to update follow status', 'error');
    }
  };

  const handleSendMessage = async () => {
    try {
      if (openDirectChat) {
        await openDirectChat(targetId);
      }
      navigate('/chats');
    } catch (err) {
      navigate('/chats');
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Profile link copied to clipboard!', 'success');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const res = await api.put('/users/profile', editForm);
      if (res.data.success) {
        updateUser(res.data.user);
        setProfileUser(res.data.user);
        setEditModalOpen(false);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openFollowersList = async () => {
    try {
      setFollowModalTitle('Followers');
      setLoadingFollowList(true);
      const res = await api.get(`/follow/${targetId}/followers`);
      if (res.data?.followers) {
        setFollowList(res.data.followers);
      }
    } catch (err) {
      addToast('Failed to fetch followers', 'error');
    } finally {
      setLoadingFollowList(false);
    }
  };

  const openFollowingList = async () => {
    try {
      setFollowModalTitle('Following');
      setLoadingFollowList(true);
      const res = await api.get(`/follow/${targetId}/following`);
      if (res.data?.following) {
        setFollowList(res.data.following);
      }
    } catch (err) {
      addToast('Failed to fetch following', 'error');
    } finally {
      setLoadingFollowList(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Cover & Profile Header Card */}
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl overflow-hidden shadow-xs">
            {/* Gradient Banner */}
            <div className="h-32 sm:h-44 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 relative">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
            </div>

            {/* Profile Info Row */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                {/* Avatar */}
                <div className="p-1.5 bg-white dark:bg-dark-surface rounded-full shadow-md flex-shrink-0">
                  <Avatar
                    src={profileUser?.profilePicture}
                    name={profileUser?.fullName || 'User'}
                    size="profile"
                    status={profileUser?.isOnline ? 'online' : 'offline'}
                    priority={true}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2.5">
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={() => {
                          setEditForm({
                            fullName: authUser?.fullName || '',
                            username: authUser?.username || '',
                            bio: authUser?.bio || '',
                            profilePicture: authUser?.profilePicture || '',
                          });
                          setEditModalOpen(true);
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </button>

                      <button
                        onClick={() => navigate('/settings')}
                        className="p-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        className={`px-5 py-2 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all shadow-xs ${
                          relationship === 'mutual' || relationship === 'following'
                            ? 'bg-slate-100 dark:bg-dark-card text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600'
                            : relationship === 'requested'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-brand-600 hover:bg-brand-700 text-white'
                        }`}
                      >
                        {relationship === 'mutual' ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Mutual</span>
                          </>
                        ) : relationship === 'following' ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Following</span>
                          </>
                        ) : relationship === 'requested' ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Requested</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>

                      {activeUserStream && (
                        <button
                          onClick={() => navigate(`/live/${activeUserStream._id}`)}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-red-600/30 animate-pulse transition-all"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Watch Live</span>
                        </button>
                      )}

                      <button
                        onClick={handleSendMessage}
                        className="px-3.5 py-2 bg-brand-500/10 hover:bg-brand-500/15 text-brand-600 dark:text-brand-400 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>

                      <button
                        onClick={() => startCall(profileUser, 'audio')}
                        className="p-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => startCall(profileUser, 'video')}
                        className="p-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleShareProfile}
                    className="p-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                    title="Share Profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Names & Bio */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profileUser?.fullName || 'ChatFlow Creator'}
                  </h1>
                  <span className="p-0.5 bg-brand-500 text-white rounded-full">
                    <Sparkles className="w-3 h-3" />
                  </span>
                  {profileUser?.isPrivate && (
                    <span className="p-1 bg-slate-100 dark:bg-dark-card text-slate-500 rounded-lg text-[10px] font-semibold flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Private</span>
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  @{profileUser?.username}
                </p>

                {profileUser?.bio ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                    {profileUser.bio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {isOwnProfile ? 'No bio added yet. Click Edit Profile to add one.' : 'No bio available.'}
                  </p>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-around sm:justify-start sm:space-x-10 mt-6 pt-5 border-t border-slate-100 dark:border-dark-border">
                <div className="text-center sm:text-left">
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {profileUser?.postsCount ?? posts.length}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
                    Posts
                  </p>
                </div>

                <div
                  onClick={openFollowersList}
                  className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {profileUser?.followersCount ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
                    Followers
                  </p>
                </div>

                <div
                  onClick={openFollowingList}
                  className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {profileUser?.followingCount ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
                    Following
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Private Lock Shield or Tabs */}
          {isPrivateLocked ? (
            <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-dark-card text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  This Account is Private
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mx-auto leading-relaxed">
                  Follow {profileUser?.fullName || 'this user'} to see their photos, vertical reels, and updates.
                </p>
              </div>
              <button
                onClick={handleFollowToggle}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  relationship === 'requested'
                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {relationship === 'requested' ? 'Requested' : 'Follow'}
              </button>
            </div>
          ) : (
            <>
              {/* Profile Navigation Tabs */}
              <div className="flex items-center justify-center space-x-2 border-b border-slate-200 dark:border-dark-border">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex items-center space-x-2 py-3 px-6 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'posts'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>POSTS ({posts.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('reels')}
                  className={`flex items-center space-x-2 py-3 px-6 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'reels'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-900'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>REELS ({reels.length})</span>
                </button>

                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex items-center space-x-2 py-3 px-6 text-xs font-bold border-b-2 transition-all ${
                      activeTab === 'saved'
                        ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                        : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-900'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>SAVED ({savedPosts.length})</span>
                  </button>
                )}
              </div>

          {/* Tab Content */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-slate-200 dark:bg-dark-card animate-pulse"
                />
              ))}
            </div>
          ) : activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border p-6">
                <Grid className="w-10 h-10 text-slate-300 dark:text-dark-muted mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Posts Yet
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isOwnProfile ? 'Share your thoughts, photos, or updates with the world.' : 'This creator has not shared any posts yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {posts.map((post) => (
                  <div
                    key={post._id}
                    onClick={() => setSelectedPost(post)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-900"
                  >
                    <img
                      src={post.media?.[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'}
                      alt="Post"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Hover Stats */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4 text-white">
                      <div className="flex items-center space-x-1 text-xs font-bold">
                        <Heart className="w-4 h-4 fill-white" />
                        <span>{post.likesCount ?? post.likes?.length ?? 0}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs font-bold">
                        <MessageSquare className="w-4 h-4 fill-white" />
                        <span>{post.commentsCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'reels' ? (
            reels.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border p-6">
                <Film className="w-10 h-10 text-slate-300 dark:text-dark-muted mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Reels Yet
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isOwnProfile ? 'Create quick vertical video reels to entertain your audience.' : 'This creator has not uploaded reels yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {reels.map((reel) => (
                  <div
                    key={reel._id}
                    onClick={() => navigate('/reels')}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer bg-slate-900 ring-1 ring-purple-500/20"
                  >
                    <img
                      src={reel.thumbnail || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80'}
                      alt="Reel"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-lg text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    {/* View count at bottom */}
                    <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-white text-xs font-bold drop-shadow-md">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{reel.views ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // SAVED TAB
            savedPosts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border p-6">
                <Bookmark className="w-10 h-10 text-slate-300 dark:text-dark-muted mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Saved Posts
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Save posts and reels you like to view them later privately.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {savedPosts.map((post) => (
                  <div
                    key={post._id}
                    onClick={() => setSelectedPost(post)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-900"
                  >
                    <img
                      src={post.media?.[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'}
                      alt="Saved Post"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-lg text-amber-400">
                      <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  </main>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Creator Profile
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-card text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar
                  src={editForm.profilePicture}
                  name={editForm.fullName}
                  size="xl"
                  priority={true}
                  className="flex-shrink-0"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Crop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const seed = Date.now();
                      setEditForm((prev) => ({
                        ...prev,
                        profilePicture: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`,
                      }));
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-500" />
                    <span>Randomize Avatar</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell followers about your passions, projects, or interests..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-dark-card text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Followers / Following List Modal */}
      {followModalTitle && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setFollowModalTitle(null)}
        >
          <div
            className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {followModalTitle}
              </h3>
              <button
                onClick={() => setFollowModalTitle(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-card text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3">
              {loadingFollowList ? (
                <p className="text-xs text-center text-slate-400 py-4">Loading...</p>
              ) : followList.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-6">
                  No {followModalTitle.toLowerCase()} yet.
                </p>
              ) : (
                followList.map((fUser) => (
                  <div
                    key={fUser._id}
                    onClick={() => {
                      setFollowModalTitle(null);
                      navigate(`/profile/${fUser._id}`);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-card cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Avatar
                        src={fUser.profilePicture}
                        name={fUser.fullName}
                        size="sm"
                        status={fUser.isOnline ? 'online' : 'offline'}
                        className="flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {fUser.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          @{fUser.username}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Post Preview Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PostCard
              post={selectedPost}
              onOpenComments={(p) => setSelectedCommentsPost(p)}
              onDelete={(postId) => {
                setPosts((prev) => prev.filter((p) => p._id !== postId));
                setSelectedPost(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {selectedCommentsPost && (
        <CommentsModal
          isOpen={Boolean(selectedCommentsPost)}
          onClose={() => setSelectedCommentsPost(null)}
          postId={selectedCommentsPost._id}
          postAuthor={selectedCommentsPost.author}
          postCaption={selectedCommentsPost.content}
        />
      )}

      {/* 1:1 Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={Boolean(cropImageSrc)}
        imageSrc={cropImageSrc}
        onClose={() => setCropImageSrc(null)}
        onSave={(croppedDataUrl) => {
          setEditForm((prev) => ({ ...prev, profilePicture: croppedDataUrl }));
          addToast('Profile picture cropped! Click Save Changes to apply.', 'info');
        }}
      />
    </div>
  );
};

export default SocialProfilePage;
