import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Lock,
  MessageSquare,
  UserCheck,
  Sparkles,
  Eye,
  Globe,
  Bot,
  X,
} from 'lucide-react';
import { SettingToggle, SettingSelect } from './SettingRow';

const PrivacyCheckupModal = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  // Calculate authentic privacy score
  const calculatePrivacyScore = (s) => {
    let score = 30; // base score
    if (s?.privacy?.accountPrivacy === 'private') score += 20;
    if (s?.privacy?.messagePermission === 'connections' || s?.privacy?.messagePermission === 'nobody') score += 15;
    if (!s?.privacy?.onlineStatus) score += 10;
    if (!s?.privacy?.readReceipts) score += 5;
    if (!s?.privacy?.searchEngineIndexing) score += 10;
    if (s?.privacy?.groupInvitePermission === 'connections' || s?.privacy?.groupInvitePermission === 'nobody') score += 5;
    if (!s?.ai?.useChatsForPersonalization) score += 5;
    return Math.min(score, 100);
  };

  const currentScore = calculatePrivacyScore(settings);

  const steps = [
    {
      id: 'profile',
      title: 'Profile Visibility',
      icon: Lock,
      description: 'Control whether strangers or only approved followers can see your profile details.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Private Account
              </p>
              <p className="text-[11px] text-slate-500">
                Only people you approve can see your posts and stories.
              </p>
            </div>
            <SettingToggle
              checked={settings?.privacy?.accountPrivacy === 'private'}
              onChange={(val) =>
                onUpdateSettings('privacy', { accountPrivacy: val ? 'private' : 'public' })
              }
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Hide Follower / Following Lists
              </p>
              <p className="text-[11px] text-slate-500">
                Prevent other users from browsing who you follow.
              </p>
            </div>
            <SettingToggle
              checked={settings?.profile?.hideFollowerCount || false}
              onChange={(val) =>
                onUpdateSettings('profile', { hideFollowerCount: val, hideFollowingCount: val })
              }
            />
          </div>
        </div>
      ),
    },
    {
      id: 'messages',
      title: 'Direct Messaging & Calls',
      icon: MessageSquare,
      description: 'Choose who can reach your inbox and start voice/video conversations.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Who Can Message Me
              </p>
              <p className="text-[11px] text-slate-500">
                Unsolicited messages from others are placed into message requests or blocked.
              </p>
            </div>
            <SettingSelect
              value={settings?.privacy?.messagePermission || 'everyone'}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'followers', label: 'Followers' },
                { value: 'connections', label: 'Mutual Connections' },
                { value: 'nobody', label: 'Nobody' },
              ]}
              onChange={(val) => onUpdateSettings('privacy', { messagePermission: val })}
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Who Can Call Me
              </p>
              <p className="text-[11px] text-slate-500">
                Protect your device from unexpected audio/video calls.
              </p>
            </div>
            <SettingSelect
              value={settings?.messages?.whoCanCall || 'connections'}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'connections', label: 'Mutual Connections Only' },
                { value: 'nobody', label: 'Nobody' },
              ]}
              onChange={(val) => onUpdateSettings('messages', { whoCanCall: val })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'connections',
      title: 'Connections & Group Invites',
      icon: UserCheck,
      description: 'Manage who can send you connection requests and add you to groups.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Connection Requests
              </p>
              <p className="text-[11px] text-slate-500">
                Control who can request mutual networking connection.
              </p>
            </div>
            <SettingSelect
              value={settings?.privacy?.connectionPermission || 'everyone'}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'followers', label: 'Followers Only' },
                { value: 'friends_of_friends', label: 'Friends of Friends' },
                { value: 'nobody', label: 'Nobody' },
              ]}
              onChange={(val) => onUpdateSettings('privacy', { connectionPermission: val })}
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Add Me to Groups
              </p>
              <p className="text-[11px] text-slate-500">
                Prevent unknown users from adding you to group chats without permission.
              </p>
            </div>
            <SettingSelect
              value={settings?.privacy?.groupInvitePermission || 'connections'}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'connections', label: 'Connections Only' },
                { value: 'nobody', label: 'Nobody' },
              ]}
              onChange={(val) => onUpdateSettings('privacy', { groupInvitePermission: val })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'stories',
      title: 'Story & Reel Audience',
      icon: Sparkles,
      description: 'Set default audience boundaries for ephemeral and video media.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Default Story Audience
              </p>
              <p className="text-[11px] text-slate-500">
                Who is permitted to view your 24-hour stories.
              </p>
            </div>
            <SettingSelect
              value={settings?.stories?.storyPrivacy || 'everyone'}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'followers', label: 'Followers' },
                { value: 'connections', label: 'Connections Only' },
                { value: 'close_friends', label: 'Close Friends Only' },
              ]}
              onChange={(val) => onUpdateSettings('stories', { storyPrivacy: val })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'activity',
      title: 'Activity & Presence Status',
      icon: Eye,
      description: 'Manage whether other users can see your active now indicator and read receipts.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Show Online Status
              </p>
              <p className="text-[11px] text-slate-500">
                People you interact with can see when you are actively using ChatFlow.
              </p>
            </div>
            <SettingToggle
              checked={settings?.privacy?.onlineStatus ?? true}
              onChange={(val) => onUpdateSettings('privacy', { onlineStatus: val })}
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Read Receipts
              </p>
              <p className="text-[11px] text-slate-500">
                Send double checkmarks when you open and read a message.
              </p>
            </div>
            <SettingToggle
              checked={settings?.privacy?.readReceipts ?? true}
              onChange={(val) => {
                onUpdateSettings('privacy', { readReceipts: val });
                onUpdateSettings('messages', { readReceipts: val });
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'discovery',
      title: 'Search & External Discovery',
      icon: Globe,
      description: 'Control how your profile appears in search and algorithmic suggestions.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Allow Discovery by Email
              </p>
              <p className="text-[11px] text-slate-500">
                Let contacts find your account if they have your email in their address book.
              </p>
            </div>
            <SettingToggle
              checked={settings?.privacy?.emailDiscovery ?? true}
              onChange={(val) => onUpdateSettings('privacy', { emailDiscovery: val })}
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Search Engine Indexing
              </p>
              <p className="text-[11px] text-slate-500">
                Allow Google, Bing, and other web engines to index your public profile.
              </p>
            </div>
            <SettingToggle
              checked={settings?.privacy?.searchEngineIndexing ?? false}
              onChange={(val) => onUpdateSettings('privacy', { searchEngineIndexing: val })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      title: 'AI Privacy & Smart Learning',
      icon: Bot,
      description: 'Understand how ChatFlow AI assists you without compromising your private messages.',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Save AI Assistant History
              </p>
              <p className="text-[11px] text-slate-500">
                Retain smart summaries and writing suggestions in your encrypted personal storage.
              </p>
            </div>
            <SettingToggle
              checked={settings?.ai?.saveAiHistory ?? true}
              onChange={(val) => onUpdateSettings('ai', { saveAiHistory: val })}
            />
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Use Chats for Personalization
              </p>
              <p className="text-[11px] text-slate-500">
                Never enabled by default. Only used if you explicitly request personalized AI assistance.
              </p>
            </div>
            <SettingToggle
              checked={settings?.ai?.useChatsForPersonalization ?? false}
              onChange={(val) => onUpdateSettings('ai', { useChatsForPersonalization: val })}
            />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-scale-up">
        {/* Modal Header with Privacy Score */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Interactive Privacy Checkup</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  Score: {currentScore}/100
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Step {currentStep + 1} of {steps.length}: {current.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-dark-card rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-brand-500 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {current.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                {current.description}
              </p>
            </div>
          </div>

          <div className="pt-2">{current.content}</div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-dark-border">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors flex items-center space-x-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center space-x-1.5"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Checkup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyCheckupModal;
