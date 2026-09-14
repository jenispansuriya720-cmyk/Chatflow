import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Hash, TrendingUp, Users, Loader2, CheckCircle2 } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import StoriesTray from '../../components/social/StoriesTray';
import StoryViewerModal from '../../components/social/StoryViewerModal';
import CreateStoryModal from '../../components/social/CreateStoryModal';
import PostComposer from '../../components/social/PostComposer';
import PostCard from '../../components/social/PostCard';
import CommentsModal from '../../components/social/CommentsModal';
import SharePostModal from '../../components/social/SharePostModal';
import CreateReelModal from '../../components/social/CreateReelModal';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const HomePage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [storyGroups, setStoryGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Modals state
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [createReelOpen, setCreateReelOpen] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);
  const [activeSharePost, setActiveSharePost] = useState(null);

  useEffect(() => {
    loadStories();
    loadFeed();
    loadSuggestedUsers();
  }, []);

  const loadStories = async () => {
    try {
      const res = await api.get('/stories');
      if (res.data.success) {
        setStoryGroups(res.data.storyGroups);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const loadFeed = async () => {
    try {
      setLoadingPosts(true);
      const res = await api.get('/posts/feed');
      if (res.data.success) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const res = await api.get('/users?onlineOnly=false');
      if (res.data.success) {
        setSuggestedUsers(res.data.users.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowSuggested = async (targetUserId) => {
    try {
      const res = await api.post(`/follow/${targetUserId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSuggestedUsers((prev) => prev.filter((u) => u._id !== targetUserId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      {/* Unified Navigation Sidebar */}
      <Sidebar
        onOpenCreateStory={() => setCreateStoryOpen(true)}
        onOpenCreateReel={() => setCreateReelOpen(true)}
      />

      {/* Main Social Content Area */}
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Central Feed Scroll Container */}
        <main className="flex-1 h-full overflow-y-auto pt-16 md:pt-6 pb-20 md:pb-8 px-3 sm:px-6">
          <div className="max-w-xl mx-auto space-y-5">
            {/* Personalized Greeting Header (Section 94) */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>
                    {(() => {
                      const hour = new Date().getHours();
                      if (hour < 12) return 'Good morning';
                      if (hour < 18) return 'Good afternoon';
                      return 'Good evening';
                    })()}
                    , {user?.fullName?.split(' ')[0] || user?.username || 'Creator'} 👋
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                  Here is what is happening in your network today
                </p>
              </div>
            </div>

            {/* 1. Stories Tray */}
            <StoriesTray
              storyGroups={storyGroups}
              onSelectGroup={(group) => setSelectedStoryGroup(group)}
              onOpenCreateStory={() => setCreateStoryOpen(true)}
            />

            {/* 2. Post Composer */}
            <PostComposer
              onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
            />

            {/* Feed Section Title */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                For You
              </span>
            </div>

            {/* 3. Posts Stream */}
            <div className="space-y-4">
              {loadingPosts ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
                  <span className="text-xs text-slate-400">Loading your feed...</span>
                </div>
              ) : posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onOpenComments={(p) => setActiveCommentsPost(p)}
                      onOpenShare={(p) => setActiveSharePost(p)}
                      onHidePost={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
                    />
                  ))}
                  {/* Responsible Consumption Checkpoint (Section 42) */}
                  <div className="text-center py-8 space-y-2 select-none border-t border-slate-200/60 dark:border-dark-border/60 mt-6 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      You're all caught up
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Come back when you have something new to see.
                    </p>
                  </div>
                </>
              ) : (
                /* Empty Home Experience (Section 10) */
                <div className="text-center p-8 sm:p-12 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/80 dark:border-dark-border space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center mx-auto">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Welcome to ChatFlow 👋
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs mx-auto leading-relaxed">
                      Your feed will grow as you connect with people and follow topics.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <button
                      onClick={() => navigate('/people')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Find People</span>
                    </button>
                    <button
                      onClick={() => navigate('/explore')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      Explore Interests
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Desktop Right Sidebar: Creator Profile & Suggestions */}
        <aside className="hidden lg:flex flex-col w-80 h-full p-6 border-l border-slate-200 dark:border-dark-border overflow-y-auto space-y-6 select-none bg-white dark:bg-dark-surface/40">
          {/* User Profile Mini Card */}
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <Avatar
              src={user?.profilePicture}
              name={user?.fullName}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
                {user?.fullName}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
            </div>
          </div>

          {/* Suggested Creators Widget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wider text-[10px]">
                Suggested for you
              </span>
              <button
                onClick={() => navigate('/contacts')}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                See all
              </button>
            </div>

            <div className="space-y-3">
              {suggestedUsers.map((su) => (
                <div key={su._id} className="flex items-center justify-between">
                  <div
                    onClick={() => navigate(`/profile/${su._id}`)}
                    className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
                  >
                    <Avatar
                      src={su.profilePicture}
                      name={su.fullName}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {su.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">@{su.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowSuggested(su._id)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 ml-2 flex-shrink-0"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Hashtags */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-dark-border">
            <span className="font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wider text-[10px] flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending Topics</span>
            </span>

            <div className="space-y-1.5 pt-1 text-xs">
              {[
                { tag: 'fullstack', count: '14.2K posts' },
                { tag: 'react', count: '8.9K posts' },
                { tag: 'ai', count: '24.5K posts' },
                { tag: 'socketio', count: '3.1K posts' },
                { tag: 'design', count: '11.4K posts' },
              ].map((item) => (
                <div
                  key={item.tag}
                  onClick={() => navigate('/explore')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover cursor-pointer transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    #{item.tag}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Story Viewer Modal */}
      {selectedStoryGroup && (
        <StoryViewerModal
          storyGroup={selectedStoryGroup}
          onClose={() => setSelectedStoryGroup(null)}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onStoryCreated={() => loadStories()}
      />

      {/* Create Reel Modal */}
      <CreateReelModal
        isOpen={createReelOpen}
        onClose={() => setCreateReelOpen(false)}
      />

      {/* Post Comments Modal */}
      {activeCommentsPost && (
        <CommentsModal
          post={activeCommentsPost}
          isOpen={!!activeCommentsPost}
          onClose={() => setActiveCommentsPost(null)}
        />
      )}

      {/* Share Post Modal */}
      {activeSharePost && (
        <SharePostModal
          post={activeSharePost}
          isOpen={!!activeSharePost}
          onClose={() => setActiveSharePost(null)}
        />
      )}
    </div>
  );
};

export default HomePage;
