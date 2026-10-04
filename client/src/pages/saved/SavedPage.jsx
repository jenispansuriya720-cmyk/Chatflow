import React, { useState, useEffect } from 'react';
import { Bookmark, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import PostCard from '../../components/social/PostCard';
import CommentsModal from '../../components/social/CommentsModal';
import SharePostModal from '../../components/social/SharePostModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SavedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'reels'
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedReels, setSavedReels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCommentsPost, setActiveCommentsPost] = useState(null);
  const [activeSharePost, setActiveSharePost] = useState(null);

  useEffect(() => {
    fetchSavedContent();
  }, [activeTab]);

  const fetchSavedContent = async () => {
    try {
      setLoading(true);
      if (activeTab === 'posts') {
        const res = await api.get('/posts/saved');
        if (res.data?.success) {
          setSavedPosts(res.data.posts || []);
        }
      } else {
        const res = await api.get('/reels/saved');
        if (res.data?.success) {
          setSavedReels(res.data.reels || []);
        }
      }
    } catch (err) {
      console.error('Failed to load saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100 select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header */}
        <header className="px-4 sm:px-6 pt-14 md:pt-4 pb-4 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Saved Bookmarks
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Private collection of your favorite posts and reels
              </p>
            </div>
          </div>
        </header>

        {/* Tab Toggle */}
        <div className="px-6 border-b border-slate-200 dark:border-dark-border bg-white/70 dark:bg-dark-surface/70 backdrop-blur-md flex items-center space-x-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3.5 border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'posts'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Saved Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`py-3.5 border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'reels'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Saved Reels</span>
          </button>
        </div>

        {/* Content Stream */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-xl mx-auto space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-xs text-slate-400">Loading saved items...</p>
              </div>
            ) : activeTab === 'posts' ? (
              savedPosts.length > 0 ? (
                savedPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onOpenComments={(p) => setActiveCommentsPost(p)}
                    onOpenShare={(p) => setActiveSharePost(p)}
                  />
                ))
              ) : (
                <div className="text-center p-12 bg-white dark:bg-dark-card rounded-3xl border border-slate-200/80 dark:border-dark-border space-y-3">
                  <Bookmark className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No saved posts yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Click the bookmark icon on any post in your feed to save it here.
                  </p>
                </div>
              )
            ) : savedReels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {savedReels.map((reel) => (
                  <div
                    key={reel._id}
                    onClick={() => navigate('/reels')}
                    className="aspect-[9/16] rounded-2xl overflow-hidden bg-black relative cursor-pointer group shadow-sm"
                  >
                    <video
                      src={reel.video}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end text-white">
                      <p className="text-xs font-bold line-clamp-1">{reel.caption || 'Reel'}</p>
                      <p className="text-[10px] text-slate-300">@{reel.author?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-white dark:bg-dark-card rounded-3xl border border-slate-200/80 dark:border-dark-border space-y-3">
                <Film className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No saved reels yet
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Bookmark vertical reels while watching to view them here later.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {activeCommentsPost && (
        <CommentsModal
          post={activeCommentsPost}
          isOpen={!!activeCommentsPost}
          onClose={() => setActiveCommentsPost(null)}
        />
      )}

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

export default SavedPage;
