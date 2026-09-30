import React from 'react';
import { Plus, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

const StoriesTray = ({
  storyGroups = [],
  loading = false,
  error = null,
  onRetry,
  onSelectGroup,
  onOpenCreateStory,
}) => {
  const { user } = useAuth();

  const myUserId = user?._id?.toString() || user?.id?.toString();

  // Find current user's story group if any
  const myStoryGroup = storyGroups.find((g) => {
    const groupUserId = g.user?._id?.toString() || g.user?.toString();
    return groupUserId && groupUserId === myUserId;
  });

  const hasMyStories = Boolean(
    myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length > 0
  );

  // Stories created by REAL users whom the current user follows
  const otherStoryGroups = storyGroups.filter((g) => {
    const groupUserId = g.user?._id?.toString() || g.user?.toString();
    return !groupUserId || groupUserId !== myUserId;
  });

  return (
    <section
      aria-label="Stories"
      className="story-panel p-3 sm:p-4 bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl select-none shadow-xs"
    >
      <div className="story-list">
        {/* 1. Current User's Story ("Your story" - ALWAYS FIRST) */}
        <div
          id="story-item-self"
          className="story-item"
          onClick={() => {
            if (hasMyStories) {
              onSelectGroup(myStoryGroup);
            } else {
              onOpenCreateStory();
            }
          }}
        >
          <div className="relative">
            <div
              className={`story-avatar-wrapper ${
                hasMyStories ? 'story-ring-unviewed' : 'story-ring-none'
              }`}
            >
              <div className="story-avatar-inner">
                <div className="story-avatar">
                  <Avatar
                    src={user?.profilePicture}
                    name={user?.fullName || user?.username || 'You'}
                    size="story"
                  />
                </div>
              </div>
            </div>

            {/* Add story (+) badge */}
            <button
              type="button"
              id="btn-add-story"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateStory();
              }}
              className="story-add-button"
              title="Add to story"
              aria-label="Add story"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <span className="story-name text-slate-700 dark:text-slate-300">
            Your story
          </span>
        </div>

        {/* 2. Loading Skeleton State */}
        {loading && (
          <>
            {[1, 2, 3].map((sk) => (
              <div key={`story-skel-${sk}`} className="story-item animate-pulse">
                <div className="story-skeleton" />
                <div className="h-2.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-full mt-1" />
              </div>
            ))}
          </>
        )}

        {/* 3. Error State with Retry */}
        {!loading && error && (
          <div className="flex items-center space-x-2 px-3 py-2 my-auto bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
                title="Retry loading stories"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 4. Active Stories from Followed Users */}
        {!loading &&
          !error &&
          otherStoryGroups.map((group) => {
            const hasUnviewed = group.hasUnviewed;
            const userObj = group.user || {};
            const userId = userObj._id || userObj.id || userObj;
            const displayName =
              userObj.username || userObj.fullName?.split(' ')[0] || 'User';

            return (
              <div
                key={userId}
                id={`story-item-${userId}`}
                onClick={() => onSelectGroup(group)}
                className="story-item"
              >
                <div className="relative">
                  <div
                    className={`story-avatar-wrapper ${
                      hasUnviewed ? 'story-ring-unviewed' : 'story-ring-viewed'
                    }`}
                  >
                    <div className="story-avatar-inner">
                      <div className="story-avatar">
                        <Avatar
                          src={userObj.profilePicture}
                          name={userObj.fullName || userObj.username || 'User'}
                          size="story"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <span className="story-name text-slate-700 dark:text-slate-300">
                  {displayName}
                </span>
              </div>
            );
          })}

        {/* 5. Empty State (When user follows nobody or followed users have no stories) */}
        {!loading && !error && otherStoryGroups.length === 0 && (
          <div className="flex items-center space-x-2.5 px-3.5 py-2.5 my-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-dark-border rounded-2xl flex-shrink-0 select-none">
            <div className="w-7 h-7 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-snug">
                Follow people to see their stories
              </span>
              <Link
                to="/contacts"
                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Find creators &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default StoriesTray;
