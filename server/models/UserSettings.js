const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // 1. Account (Section 3)
    account: {
      accountType: {
        type: String,
        enum: ['personal', 'creator', 'business'],
        default: 'personal',
      },
      phone: { type: String, default: '' },
      dob: { type: String, default: '' },
      status: {
        type: String,
        enum: ['active', 'deactivated'],
        default: 'active',
      },
      phoneVerified: { type: Boolean, default: false },
    },

    // 2. Profile Visibility & Preferences (Section 4)
    profile: {
      website: { type: String, default: '' },
      location: { type: String, default: '' },
      pronouns: { type: String, default: '' },
      profession: { type: String, default: '' },
      hideFollowerCount: { type: Boolean, default: false },
      hideFollowingCount: { type: Boolean, default: false },
      hideOnlineStatus: { type: Boolean, default: false },
      hideActivityStatus: { type: Boolean, default: false },
    },

    // 3. Privacy (Section 5)
    privacy: {
      accountPrivacy: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
      },
      followPermission: {
        type: String,
        enum: ['everyone', 'approved', 'nobody'],
        default: 'everyone',
      },
      connectionPermission: {
        type: String,
        enum: ['everyone', 'followers', 'friends_of_friends', 'nobody'],
        default: 'everyone',
      },
      messagePermission: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'nobody'],
        default: 'everyone',
      },
      groupInvitePermission: {
        type: String,
        enum: ['everyone', 'connections', 'nobody'],
        default: 'connections',
      },
      mentionPermission: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'nobody'],
        default: 'everyone',
      },
      tagPermission: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'nobody'],
        default: 'everyone',
      },
      activityVisibility: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'only_me'],
        default: 'everyone',
      },
      onlineStatus: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      typingIndicator: { type: Boolean, default: true },
      emailDiscovery: { type: Boolean, default: true },
      phoneDiscovery: { type: Boolean, default: false },
      searchEngineIndexing: { type: Boolean, default: false },
      suggestProfile: { type: Boolean, default: true },
    },

    // 4. Security (Section 6)
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorMethod: {
        type: String,
        enum: ['authenticator', 'email', 'sms'],
        default: 'authenticator',
      },
      backupRecoveryCodes: [
        {
          code: { type: String },
          used: { type: Boolean, default: false },
        },
      ],
      newLoginAlerts: { type: Boolean, default: true },
      suspiciousLoginDetection: { type: Boolean, default: true },
      loginApproval: { type: Boolean, default: false },
      securityLog: [
        {
          event: { type: String, required: true },
          ip: { type: String, default: '127.0.0.1' },
          device: { type: String, default: 'Desktop Browser' },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },

    // 5. Notifications (Section 7)
    notifications: {
      pauseAll: { type: Boolean, default: false },
      quietHoursEnabled: { type: Boolean, default: false },
      quietHoursStart: { type: String, default: '22:00' },
      quietHoursEnd: { type: String, default: '08:00' },
      messages: {
        newMessages: { type: Boolean, default: true },
        messageRequests: { type: Boolean, default: true },
        groupMessages: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        reactions: { type: Boolean, default: true },
      },
      social: {
        newFollowers: { type: Boolean, default: true },
        connectionRequests: { type: Boolean, default: true },
        likes: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        shares: { type: Boolean, default: true },
      },
      stories: {
        storyReplies: { type: Boolean, default: true },
        storyReactions: { type: Boolean, default: true },
        storyMentions: { type: Boolean, default: true },
      },
      reels: {
        reelLikes: { type: Boolean, default: true },
        reelComments: { type: Boolean, default: true },
        reelShares: { type: Boolean, default: true },
        reelMentions: { type: Boolean, default: true },
      },
      live: {
        creatorLive: { type: Boolean, default: true },
        liveInvites: { type: Boolean, default: true },
        liveComments: { type: Boolean, default: true },
      },
      communities: {
        newPost: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
      },
      securityAlerts: { type: Boolean, default: true },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
    },

    // 6. Messages & Calls (Section 8)
    messages: {
      messageRequests: { type: Boolean, default: true },
      messageFiltering: { type: Boolean, default: true },
      linkPreviews: { type: Boolean, default: true },
      mediaAutoDownload: {
        type: String,
        enum: ['wifi_only', 'always', 'never'],
        default: 'wifi_only',
      },
      disappearingMessages: {
        type: String,
        enum: ['off', '24h', '7d', '90d'],
        default: 'off',
      },
      whoCanCall: {
        type: String,
        enum: ['everyone', 'connections', 'nobody'],
        default: 'connections',
      },
      voiceCallsEnabled: { type: Boolean, default: true },
      videoCallsEnabled: { type: Boolean, default: true },
      enterKeySends: { type: Boolean, default: true },
      chatDensity: {
        type: String,
        enum: ['comfortable', 'compact'],
        default: 'comfortable',
      },
      chatBackground: { type: String, default: 'default' },
    },

    // 7. Social & Content (Section 9)
    content: {
      feedSort: {
        type: String,
        enum: ['personalized', 'latest', 'following'],
        default: 'personalized',
      },
      sensitiveContent: {
        type: String,
        enum: ['allow', 'limit', 'block'],
        default: 'limit',
      },
      autoplayVideos: { type: Boolean, default: true },
      autoplayReels: { type: Boolean, default: true },
      suggestedPosts: { type: Boolean, default: true },
      trendingContent: { type: Boolean, default: true },
    },

    // 8. Stories (Section 10)
    stories: {
      storyPrivacy: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'close_friends'],
        default: 'everyone',
      },
      storyReplies: {
        type: String,
        enum: ['everyone', 'followers', 'connections', 'nobody'],
        default: 'everyone',
      },
      allowReactions: { type: Boolean, default: true },
      allowSharing: { type: Boolean, default: true },
      autoArchive: { type: Boolean, default: true },
      saveOriginalMedia: { type: Boolean, default: false },
      closeFriends: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // 9. Reels (Section 11)
    reels: {
      autoplay: { type: Boolean, default: true },
      dataUsage: {
        type: String,
        enum: ['standard', 'data_saver'],
        default: 'standard',
      },
      showCaptions: { type: Boolean, default: true },
      defaultMuted: { type: Boolean, default: false },
      allowRemix: {
        type: String,
        enum: ['everyone', 'followers', 'nobody'],
        default: 'everyone',
      },
      allowDownload: { type: Boolean, default: true },
      allowComments: {
        type: String,
        enum: ['everyone', 'followers', 'nobody'],
        default: 'everyone',
      },
    },

    // 10. Live (Section 12)
    live: {
      visibility: {
        type: String,
        enum: ['everyone', 'followers', 'connections'],
        default: 'everyone',
      },
      allowComments: { type: Boolean, default: true },
      slowMode: { type: Boolean, default: false },
      allowGuests: { type: Boolean, default: true },
      notifyFollowers: { type: Boolean, default: true },
    },

    // 11. Communities & Groups (Section 13)
    communities: {
      groupInvitePermission: {
        type: String,
        enum: ['everyone', 'connections', 'nobody'],
        default: 'connections',
      },
      communityNotifications: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
    },

    // 12. AI & Smart Features (Section 14)
    ai: {
      enabled: { type: Boolean, default: true },
      assistant: { type: Boolean, default: true },
      conversationSummaries: { type: Boolean, default: true },
      suggestedReplies: { type: Boolean, default: true },
      writingAssistance: { type: Boolean, default: true },
      translation: { type: Boolean, default: true },
      voiceTranscription: { type: Boolean, default: true },
      saveAiHistory: { type: Boolean, default: true },
      useChatsForPersonalization: { type: Boolean, default: false },
    },

    // 13. Appearance (Section 15)
    appearance: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
      },
      accentColor: {
        type: String,
        enum: ['brand', 'indigo', 'emerald', 'amber', 'rose', 'purple'],
        default: 'brand',
      },
      layoutDensity: {
        type: String,
        enum: ['comfortable', 'compact'],
        default: 'comfortable',
      },
      animations: {
        type: String,
        enum: ['full', 'reduced'],
        default: 'full',
      },
      visualEffects: { type: Boolean, default: true },
      chatAppearance: {
        defaultTheme: { type: String, default: 'default' },
        bubbleStyle: {
          type: String,
          enum: ['classic', 'soft', 'compact', 'minimal'],
          default: 'classic',
        },
        fontSize: {
          type: String,
          enum: ['small', 'medium', 'large'],
          default: 'medium',
        },
        density: {
          type: String,
          enum: ['comfortable', 'compact', 'spacious'],
          default: 'comfortable',
        },
      },
      chatThemeFavorites: [{ type: String }],
      chatThemeRecent: [{ type: String }],
    },

    // 14. Accessibility (Section 16)
    accessibility: {
      reduceMotion: { type: Boolean, default: false },
      largerText: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      captions: { type: Boolean, default: true },
      screenReaderOptimized: { type: Boolean, default: false },
      focusIndicators: { type: Boolean, default: true },
    },

    // 15. Language & Region (Section 17)
    language: {
      appLanguage: { type: String, default: 'en' },
      contentLanguage: { type: String, default: 'en' },
      translationLanguage: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h',
      },
      autoTranslateMessages: { type: Boolean, default: false },
    },

    // 16. Data & Storage (Section 18)
    data: {
      autoplayOnMobile: { type: Boolean, default: false },
      highQualityMedia: { type: Boolean, default: true },
      dataSaver: { type: Boolean, default: false },
      cachedMediaBytes: { type: Number, default: 0 },
    },

    // 17. Connected Apps (Section 19)
    connectedApps: [
      {
        appId: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, default: 'app' },
        permissions: [{ type: String }],
        connectedAt: { type: Date, default: Date.now },
        lastUsed: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('UserSettings', userSettingsSchema);
