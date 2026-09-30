import React, { useState, useEffect } from 'react';
import {
  Search,
  Hash,
  TrendingUp,
  Heart,
  MessageSquare,
  Play,
  Film,
  Sparkles,
  Users,
  Compass,
  Radio,
  Image as ImageIcon,
  CheckCircle,
  UserCheck,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Avatar from '../../components/common/Avatar';
import CommentsModal from '../../components/social/CommentsModal';
import PostCard from '../../components/social/PostCard';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const TRENDING_TAGS = [
  'all',
  'fullstack',
  'ai',
  'design',
  'coding',
  'chatflow',
  'tech',
  'webdev',
  'react',
];

const ExplorePage = () => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const { startDirectChat } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTag, setActiveTag] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState('all'); // 'all', 'posts', 'reels', 'people'

  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [people, setPeople] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected post for modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCommentsPost, setSelectedCommentsPost] = useState(null);

  useEffect(() => {
    fetchExploreContent();
  }, [activeTag, contentType]);

  // Debounced search query (fast, debounced, case-insensitive per Section 84)
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchExploreContent();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchExploreContent = async () => {
    try {
      setLoading(true);
      const tagParam = activeTag !== 'all' ? `&tag=${activeTag}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

      if (contentType === 'people') {
        const res = await api.get(`/users?limit=30${searchParam}`);
        if (res.data?.users) {
          setPeople(res.data.users.filter((u) => u._id !== user?._id));
        }
      } else {
        // Fetch posts and reels in parallel
        const [postsRes, reelsRes] = await Promise.allSettled([
          api.get(`/posts/feed?limit=24${tagParam}${searchParam}`),
          api.get(`/reels/feed?limit=12${tagParam}${searchParam}`),
        ]);

        if (postsRes.status === 'fulfilled' && postsRes.value.data?.posts) {
          setPosts(postsRes.value.data.posts);
        }
        if (reelsRes.status === 'fulfilled' && reelsRes.value.data?.reels) {
          setReels(reelsRes.value.data.reels);
        }
      }
    } catch (err) {
      console.error('Failed to load explore content:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const res = await api.get('/users?limit=6');
      if (res.data?.users) {
        setSuggestedUsers(res.data.users.filter((u) => u._id !== user?._id).slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load suggested users:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExploreContent();
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await api.post(`/follow/${targetUserId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        const isFollow = res.data.isFollowing;
        const status = res.data.status;

        setSuggestedUsers((prev) =>
          prev.map((u) =>
            u._id === targetUserId ? { ...u, isFollowing: isFollow, followStatus: status } : u
          )
        );
        setPeople((prev) =>
          prev.map((u) =>
            u._id === targetUserId
              ? {
                  ...u,
                  isFollowing: isFollow,
                  followStatus: status,
                  followersCount: isFollow
                    ? (u.followersCount || 0) + 1
                    : Math.max(0, (u.followersCount || 0) - 1),
                }
              : u
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to follow user', 'error');
    }
  };

  const handleStartChatWithUser = async (targetUserId) => {
    try {
      const conv = await startDirectChat(targetUserId);
      if (conv?._id) {
        navigate(`/chat/${conv._id}`);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not start conversation', 'error');
    }
  };

  const handleConnectToggle = async (targetUserId) => {
    try {
      const res = await api.post(`/connections/${targetUserId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setPeople((prev) =>
          prev.map((u) =>
            u._id === targetUserId ? { ...u, connectionStatus: res.data.status } : u
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update connection', 'error');
    }
  };

  // Combine items for a lively explore grid (posts & reels)
  const exploreGridItems = [];
  if (contentType === 'all' || contentType === 'posts') {
    posts.forEach((p) => {
      exploreGridItems.push({
        type: 'post',
        id: p._id,
        item: p,
        mediaUrl: p.media?.[0]?.url || '',
        caption: p.content,
        author: p.author,
        likesCount: p.likesCount || p.likes?.length || 0,
        commentsCount: p.commentsCount || 0,
      });
    });
  }
  if (contentType === 'all' || contentType === 'reels') {
    reels.forEach((r) => {
      exploreGridItems.push({
        type: 'reel',
        id: r._id,
        item: r,
        mediaUrl: r.thumbnail || '',
        caption: r.caption,
        author: r.author,
        likesCount: r.likesCount || r.likes?.length || 0,
        commentsCount: r.commentsCount || 0,
        views: r.views || 0,
      });
    });
  }

  return (
    <div className="flex h-screen h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {/* Center Discovery Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 pt-16 md:pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header & Search Bar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                    <Compass className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    <span>Explore & Discover</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                    Discover trending ideas, creators, photos, reels, and new people
                  </p>
                </div>

                {/* Quick Go Live Badge */}
                <button
                  onClick={() => navigate('/live')}
                  className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Live Channels</span>
                </button>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    contentType === 'people'
                      ? 'Search people by name, @username, or interests...'
                      : 'Search topics, #hashtags, captions, creators...'
                  }
                  className="w-full pl-11 pr-24 py-3 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                >
                  Search
                </button>
              </form>

              {/* Category Pills & Content Filter */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Trending Hashtag Pills (when not in people mode) */}
                {contentType !== 'people' ? (
                  <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 max-w-full">
                    {TRENDING_TAGS.map((tag) => {
                      const isSelected = activeTag === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(tag)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                              : 'bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card'
                          }`}
                        >
                          <Hash className="w-3 h-3 opacity-70" />
                          <span>{tag === 'all' ? 'All Trends' : tag}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-500 dark:text-dark-muted flex items-center space-x-1.5 py-1">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Discovering creators and community members across ChatFlow</span>
                  </div>
                )}

                {/* Content Type Filter */}
                <div className="flex items-center bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setContentType('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      contentType === 'all'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setContentType('posts')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      contentType === 'posts'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Posts
                  </button>
                  <button
                    onClick={() => setContentType('reels')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      contentType === 'reels'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Reels
                  </button>
                  <button
                    onClick={() => setContentType('people')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      contentType === 'people'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    People
                  </button>
                </div>
              </div>
            </div>

            {/* PEOPLE DISCOVERY VIEW (Section 83, 84) */}
            {contentType === 'people' ? (
              loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-3xl bg-slate-200 dark:bg-dark-card animate-pulse"
                    />
                  ))}
                </div>
              ) : people.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-8">
                  <Users className="w-12 h-12 text-slate-300 dark:text-dark-muted mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No members found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 max-w-sm mx-auto">
                    No users matched your search criteria. Try a different name, handle or interest tag.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {people.map((p) => {
                    const online = isUserOnline(p._id);
                    const isFollowing = p.isFollowing;
                    const isRequested = p.followStatus === 'pending';

                    return (
                      <div
                        key={p._id}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-500/30 transition-all group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div
                              onClick={() => navigate(`/profile/${p._id}`)}
                              className="relative cursor-pointer flex-shrink-0"
                            >
                              <Avatar
                                src={p.profilePicture}
                                name={p.fullName}
                                size="lg"
                                status={online ? 'online' : 'offline'}
                                className="flex-shrink-0"
                              />
                            </div>

                            <button
                              onClick={() => handleStartChatWithUser(p._id)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-card dark:hover:bg-dark-hover text-slate-600 dark:text-slate-300 transition-colors"
                              title="Send Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>

                          <div
                            onClick={() => navigate(`/profile/${p._id}`)}
                            className="cursor-pointer space-y-0.5"
                          >
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                              <span>{p.fullName}</span>
                              {p.isVerified && (
                                <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                              )}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">@{p.username}</p>
                          </div>

                          {p.bio && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {p.bio}
                            </p>
                          )}

                          {p.interests && p.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {p.interests.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                          <div className="text-[11px] text-slate-400">
                            <strong className="text-slate-700 dark:text-slate-200 font-bold mr-1">
                              {p.followersCount || 0}
                            </strong>
                            followers
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleFollowToggle(p._id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 ${
                                isFollowing
                                  ? 'bg-slate-100 dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                                  : isRequested
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                  : 'bg-brand-600 hover:bg-brand-700 text-white'
                              }`}
                            >
                              {isFollowing ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Following</span>
                                </>
                              ) : isRequested ? (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Requested</span>
                                </>
                              ) : (
                                <span>Follow</span>
                              )}
                            </button>

                            <button
                              onClick={() => handleConnectToggle(p._id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                p.connectionStatus === 'connected'
                                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                  : p.connectionStatus === 'pending_sent'
                                  ? 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30'
                                  : 'border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover'
                              }`}
                            >
                              {p.connectionStatus === 'connected'
                                ? 'Connected'
                                : p.connectionStatus === 'pending_sent'
                                ? 'Requested'
                                : 'Connect'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* POSTS & REELS EXPLORE GRID */
              loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl bg-slate-200 dark:bg-dark-card animate-pulse"
                    />
                  ))}
                </div>
              ) : exploreGridItems.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-8">
                  <Compass className="w-12 h-12 text-slate-300 dark:text-dark-muted mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No content found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 max-w-sm mx-auto">
                    Try searching for another topic or selecting a different hashtag filter.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTag('all');
                      setSearchQuery('');
                      setContentType('all');
                    }}
                    className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {exploreGridItems.map((gridItem, idx) => (
                    <div
                      key={`${gridItem.type}-${gridItem.id}-${idx}`}
                      onClick={() => {
                        if (gridItem.type === 'reel') {
                          navigate('/reels');
                        } else {
                          setSelectedPost(gridItem.item);
                        }
                      }}
                      className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-900 ${
                        gridItem.type === 'reel' ? 'ring-1 ring-purple-500/30' : ''
                      }`}
                    >
                      {gridItem.mediaUrl ? (
                        <img
                          src={gridItem.mediaUrl}
                          alt={gridItem.caption || 'Explore item'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full p-4 flex flex-col justify-between text-slate-200 ${
                          gridItem.type === 'reel'
                            ? 'bg-gradient-to-b from-purple-950/70 via-slate-900 to-black'
                            : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}>
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-brand-400">
                            {gridItem.type === 'reel' ? <Film className="w-4 h-4 text-purple-400" /> : <MessageSquare className="w-4 h-4 text-brand-400" />}
                          </div>
                          <p className="text-xs font-semibold line-clamp-4 leading-relaxed text-slate-200">
                            {gridItem.caption || (gridItem.type === 'reel' ? 'Reel clip' : 'ChatFlow post')}
                          </p>
                        </div>
                      )}

                      {/* Reel badge indicator */}
                      {gridItem.type === 'reel' && (
                        <div className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white">
                          <Film className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Dark Hover Overlay with Stats */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Avatar
                              src={gridItem.author?.profilePicture}
                              name={gridItem.author?.fullName || 'User'}
                              size="xs"
                              className="flex-shrink-0"
                            />
                            <span className="text-xs font-semibold truncate max-w-[100px]">
                              {gridItem.author?.username || 'user'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center space-x-5 text-xs font-bold">
                          <div className="flex items-center space-x-1.5">
                            <Heart className="w-4 h-4 fill-white" />
                            <span>{gridItem.likesCount}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <MessageSquare className="w-4 h-4 fill-white" />
                            <span>{gridItem.commentsCount}</span>
                          </div>
                        </div>

                        <p className="text-[11px] truncate opacity-90">{gridItem.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Sticky Sidebar: Trending Topics & Suggested Creators */}
        <aside className="hidden lg:block w-80 border-l border-slate-200 dark:border-dark-border p-5 space-y-6 overflow-y-auto">
          {/* Trending Topics Box */}
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              <span>Trending for You</span>
            </h3>

            <div className="space-y-2">
              {[
                { tag: 'fullstack', category: 'Technology', count: '48.2k posts' },
                { tag: 'ai', category: 'Innovation', count: '124.8k posts' },
                { tag: 'chatflow', category: 'Trending Platform', count: '18.4k posts' },
                { tag: 'react', category: 'Web Development', count: '32.1k posts' },
                { tag: 'design', category: 'Creative UI/UX', count: '65.9k posts' },
              ].map((trend) => (
                <div
                  key={trend.tag}
                  onClick={() => {
                    setContentType('all');
                    setActiveTag(trend.tag);
                  }}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-card cursor-pointer transition-colors"
                >
                  <p className="text-[10px] text-slate-400 font-medium">{trend.category}</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">#{trend.tag}</p>
                  <p className="text-[10px] text-slate-500 dark:text-dark-muted">{trend.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Creators to Follow */}
          <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Suggested Creators</span>
              </h3>
              <button
                onClick={() => setContentType('people')}
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                See all
              </button>
            </div>

            <div className="space-y-3">
              {suggestedUsers.map((su) => (
                <div key={su._id} className="flex items-center justify-between">
                  <div
                    onClick={() => navigate(`/profile/${su._id}`)}
                    className="flex items-center space-x-2.5 cursor-pointer group min-w-0"
                  >
                    <Avatar
                      src={su.profilePicture}
                      name={su.fullName}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                        {su.fullName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        @{su.username}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowToggle(su._id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      su.isFollowing
                        ? 'bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                    }`}
                  >
                    {su.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Post Detail Modal (if clicked on a photo post) */}
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
    </div>
  );
};

export default ExplorePage;
