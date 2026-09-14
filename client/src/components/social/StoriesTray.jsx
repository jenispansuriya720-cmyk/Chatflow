import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

const StoriesTray = ({ storyGroups = [], onSelectGroup, onOpenCreateStory }) => {
  const { user } = useAuth();

  // Find current user's story group if any
  const myStoryGroup = storyGroups.find(
    (g) => g.user._id === user?._id || g.user === user?._id
  );

  const otherStoryGroups = storyGroups.filter(
    (g) => g.user._id !== user?._id && g.user !== user?._id
  );

  return (
    <div className="flex items-center space-x-4 p-4 overflow-x-auto no-scrollbar bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border rounded-3xl select-none shadow-xs">
      {/* 1. Current User's Story Circle */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
        <div className="relative">
          <div
            onClick={() => {
              if (myStoryGroup && myStoryGroup.stories.length > 0) {
                onSelectGroup(myStoryGroup);
              } else {
                onOpenCreateStory();
              }
            }}
            className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${
              myStoryGroup && myStoryGroup.stories.length > 0
                ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20'
                : 'border-2 border-dashed border-slate-300 dark:border-dark-border'
            }`}
          >
            <div className="p-0.5 rounded-full bg-white dark:bg-dark-surface">
              <Avatar
                src={user?.profilePicture}
                name={user?.fullName || 'You'}
                size="story"
              />
            </div>
          </div>

          {/* Add story (+) badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCreateStory();
            }}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-dark-surface hover:bg-brand-700 shadow-sm"
            title="Add Story"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[68px]">
          Your story
        </span>
      </div>

      {/* 2. Other Users' Story Circles */}
      {otherStoryGroups.map((group) => {
        const hasUnviewed = group.hasUnviewed;

        return (
          <div
            key={group.user._id}
            onClick={() => onSelectGroup(group)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
          >
            <div
              className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${
                hasUnviewed
                  ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 animate-pulse-slow shadow-md shadow-rose-500/20'
                  : 'bg-slate-300 dark:bg-dark-border'
              }`}
            >
              <div className="p-0.5 rounded-full bg-white dark:bg-dark-surface">
                <Avatar
                  src={group.user.profilePicture}
                  name={group.user.fullName || group.user.username}
                  size="story"
                />
              </div>
            </div>

            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[68px]">
              {group.user.username || group.user.fullName?.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesTray;
