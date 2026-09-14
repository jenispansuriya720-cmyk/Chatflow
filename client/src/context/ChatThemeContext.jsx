import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { BUILT_IN_THEMES, getThemeById } from '../constants/chatThemes';

const ChatThemeContext = createContext();

export const ChatThemeProvider = ({ conversationId, children }) => {
  const { user } = useAuth();

  const getStorageKey = useCallback(
    (cId) => `chatflow_theme_${user?._id || 'guest'}_${cId || 'none'}`,
    [user?._id]
  );

  // Initial theme state from localStorage for zero-flicker loading
  const getInitialThemeState = () => {
    if (!conversationId || !user) {
      return {
        themeType: 'preset',
        themeId: 'default',
        bubbleStyle: 'classic',
        fontSize: 'medium',
        density: 'comfortable',
        backgroundEffect: 'none',
        customTheme: null,
        isDefault: true,
      };
    }
    try {
      const cached = localStorage.getItem(getStorageKey(conversationId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Fallback
    }
    return {
      themeType: 'preset',
      themeId: 'default',
      bubbleStyle: 'classic',
      fontSize: 'medium',
      density: 'comfortable',
      backgroundEffect: 'none',
      customTheme: null,
      isDefault: true,
    };
  };

  const [themeState, setThemeState] = useState(getInitialThemeState);
  const [loadingTheme, setLoadingTheme] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recentThemes, setRecentThemes] = useState([]);
  const [globalChatAppearance, setGlobalChatAppearance] = useState(null);

  // Sync cache when conversationId changes
  useEffect(() => {
    if (conversationId && user) {
      const cached = localStorage.getItem(getStorageKey(conversationId));
      if (cached) {
        try {
          setThemeState(JSON.parse(cached));
        } catch {
          // ignore
        }
      } else {
        setThemeState({
          themeType: 'preset',
          themeId: 'default',
          bubbleStyle: 'classic',
          fontSize: 'medium',
          density: 'comfortable',
          backgroundEffect: 'none',
          customTheme: null,
          isDefault: true,
        });
      }
    }
  }, [conversationId, user, getStorageKey]);

  // Load user theme preferences (favorites, recent, global fallback)
  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      try {
        const res = await api.get('/conversations/theme-preferences');
        if (res.data.success) {
          setFavorites(res.data.favorites || []);
          setRecentThemes(res.data.recent || []);
          setGlobalChatAppearance(res.data.globalChatAppearance || null);
        }
      } catch (err) {
        console.warn('Failed to load theme preferences:', err.message);
      }
    };
    fetchPreferences();
  }, [user]);

  // Fetch server theme for current conversation
  const fetchConversationTheme = useCallback(async () => {
    if (!conversationId || !user) return;
    try {
      setLoadingTheme(true);
      const res = await api.get(`/conversations/${conversationId}/theme`);
      if (res.data.success) {
        if (res.data.theme) {
          const loaded = {
            themeType: res.data.theme.themeType || 'preset',
            themeId: res.data.theme.themeId || 'default',
            bubbleStyle: res.data.theme.bubbleStyle || 'classic',
            fontSize: res.data.theme.fontSize || 'medium',
            density: res.data.theme.density || 'comfortable',
            backgroundEffect: res.data.theme.backgroundEffect || 'none',
            customTheme: res.data.theme.customTheme || null,
            isDefault: false,
          };
          setThemeState(loaded);
          localStorage.setItem(getStorageKey(conversationId), JSON.stringify(loaded));
        } else {
          const def = {
            themeType: 'preset',
            themeId: 'default',
            bubbleStyle: 'classic',
            fontSize: 'medium',
            density: 'comfortable',
            backgroundEffect: 'none',
            customTheme: null,
            isDefault: true,
          };
          setThemeState(def);
          localStorage.removeItem(getStorageKey(conversationId));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch conversation theme from server:', err.message);
    } finally {
      setLoadingTheme(false);
    }
  }, [conversationId, user, getStorageKey]);

  useEffect(() => {
    fetchConversationTheme();
  }, [fetchConversationTheme]);

  // Save personal theme
  const saveTheme = async (newThemePayload) => {
    if (!conversationId) return { success: false, message: 'No active conversation' };
    try {
      const res = await api.put(`/conversations/${conversationId}/theme`, newThemePayload);
      if (res.data.success) {
        const saved = {
          themeType: res.data.theme.themeType,
          themeId: res.data.theme.themeId,
          bubbleStyle: res.data.theme.bubbleStyle,
          fontSize: res.data.theme.fontSize,
          density: res.data.theme.density,
          backgroundEffect: res.data.theme.backgroundEffect,
          customTheme: res.data.theme.customTheme,
          isDefault: false,
        };
        setThemeState(saved);
        localStorage.setItem(getStorageKey(conversationId), JSON.stringify(saved));

        // Update recents locally
        if (saved.themeId && saved.themeId !== 'default') {
          setRecentThemes((prev) => {
            const filtered = prev.filter((id) => id !== saved.themeId);
            return [saved.themeId, ...filtered].slice(0, 6);
          });
        }
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      console.error('Error saving chat theme:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to save theme',
      };
    }
  };

  // Reset theme to default
  const resetTheme = async () => {
    if (!conversationId) return;
    try {
      const res = await api.delete(`/conversations/${conversationId}/theme`);
      if (res.data.success) {
        const def = {
          themeType: 'preset',
          themeId: 'default',
          bubbleStyle: 'classic',
          fontSize: 'medium',
          density: 'comfortable',
          backgroundEffect: 'none',
          customTheme: null,
          isDefault: true,
        };
        setThemeState(def);
        localStorage.removeItem(getStorageKey(conversationId));
        return { success: true };
      }
    } catch (err) {
      console.error('Error resetting chat theme:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to reset theme',
      };
    }
  };

  // Toggle favorite theme
  const toggleFavorite = async (themeId) => {
    try {
      const res = await api.put('/conversations/theme-favorites', { themeId });
      if (res.data.success) {
        setFavorites(res.data.favorites);
      }
    } catch (err) {
      console.error('Failed to toggle favorite theme:', err);
    }
  };

  // Determine active theme colors (Priority: Personal Theme -> Global Appearance -> Built-in Default)
  const resolvedTheme = useMemo(() => {
    if (themeState.themeType === 'custom' && themeState.customTheme) {
      return {
        id: 'custom',
        name: 'Custom Theme',
        isDark: false,
        ...themeState.customTheme,
      };
    }

    if (themeState.themeId && themeState.themeId !== 'default') {
      return getThemeById(themeState.themeId);
    }

    // If default, check global appearance settings
    if (globalChatAppearance?.defaultTheme && globalChatAppearance.defaultTheme !== 'default') {
      return getThemeById(globalChatAppearance.defaultTheme);
    }

    return getThemeById('default');
  }, [themeState, globalChatAppearance]);

  // CSS variables mapping for `.chat-theme-scope`
  const themeCssVars = useMemo(() => {
    const t = resolvedTheme;
    return {
      '--chat-bg': t.background || '#ffffff',
      '--chat-bg-secondary': t.backgroundSecondary || '#f8fafc',
      '--chat-incoming': t.incomingBubble || '#ffffff',
      '--chat-incoming-text': t.incomingText || '#0f172a',
      '--chat-outgoing': t.outgoingBubble || '#4f46e5',
      '--chat-outgoing-text': t.outgoingText || '#ffffff',
      '--chat-header': t.headerBackground || '#ffffff',
      '--chat-input': t.inputBackground || '#f1f5f9',
      '--chat-input-text': t.inputText || '#0f172a',
      '--chat-input-placeholder': t.inputPlaceholder || '#94a3b8',
      '--chat-accent': t.primaryAccent || '#4f46e5',
      '--chat-border': t.borderColor || '#e2e8f0',
      '--chat-timestamp': t.timestampColor || '#94a3b8',
      '--chat-link': t.linkColor || '#3b82f6',
    };
  }, [resolvedTheme]);

  const value = {
    themeState,
    resolvedTheme,
    bubbleStyle: themeState.bubbleStyle || globalChatAppearance?.bubbleStyle || 'classic',
    fontSize: themeState.fontSize || globalChatAppearance?.fontSize || 'medium',
    density: themeState.density || globalChatAppearance?.density || 'comfortable',
    backgroundEffect: themeState.backgroundEffect || 'none',
    wallpaper: resolvedTheme.wallpaper || '',
    wallpaperOpacity: resolvedTheme.wallpaperOpacity ?? 80,
    isDefault: themeState.isDefault,
    loadingTheme,
    saveTheme,
    resetTheme,
    favorites,
    toggleFavorite,
    recentThemes,
    themeCssVars,
    refetchTheme: fetchConversationTheme,
  };

  return <ChatThemeContext.Provider value={value}>{children}</ChatThemeContext.Provider>;
};

export const useChatTheme = () => {
  const context = useContext(ChatThemeContext);
  if (!context) {
    // Return safe fallback if rendered outside provider (e.g. settings or tests)
    const def = getThemeById('default');
    return {
      themeState: { themeId: 'default', bubbleStyle: 'classic' },
      resolvedTheme: def,
      bubbleStyle: 'classic',
      fontSize: 'medium',
      density: 'comfortable',
      wallpaper: '',
      wallpaperOpacity: 80,
      isDefault: true,
      loadingTheme: false,
      favorites: [],
      recentThemes: [],
      themeCssVars: {},
      saveTheme: async () => ({ success: true }),
      resetTheme: async () => ({ success: true }),
      toggleFavorite: () => {},
    };
  }
  return context;
};

export default ChatThemeContext;
