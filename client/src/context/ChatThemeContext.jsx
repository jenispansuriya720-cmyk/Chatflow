import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useChat } from './ChatContext';
import { BUILT_IN_THEMES, getThemeById } from '../constants/chatThemes';

const ChatThemeContext = createContext();

export const ChatThemeProvider = ({ conversationId, children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { activeConversation, setConversations, setActiveConversation } = useChat();

  // Initial theme from active conversation if present, otherwise default
  const getInitialTheme = () => {
    if (activeConversation && activeConversation._id === conversationId && activeConversation.theme) {
      return activeConversation.theme;
    }
    return 'default';
  };

  const [themeState, setThemeState] = useState(() => ({
    themeType: 'preset',
    themeId: getInitialTheme(),
    bubbleStyle: 'classic',
    fontSize: 'medium',
    density: 'comfortable',
    backgroundEffect: 'none',
    customTheme: null,
    isDefault: getInitialTheme() === 'default',
  }));

  const [loadingTheme, setLoadingTheme] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recentThemes, setRecentThemes] = useState([]);
  const [globalChatAppearance, setGlobalChatAppearance] = useState(null);

  // Sync state when activeConversation changes
  useEffect(() => {
    if (activeConversation && activeConversation._id === conversationId && activeConversation.theme) {
      setThemeState((prev) => ({
        ...prev,
        themeId: activeConversation.theme,
        isDefault: activeConversation.theme === 'default',
      }));
    }
  }, [conversationId, activeConversation?.theme]);

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

  // Fetch shared server theme for this conversation
  const fetchConversationTheme = useCallback(async () => {
    if (!conversationId || !user) return;
    try {
      setLoadingTheme(true);
      const res = await api.get(`/conversations/${conversationId}/theme`);
      if (res.data.success && res.data.theme) {
        const loadedTheme = res.data.theme || 'default';
        setThemeState((prev) => ({
          ...prev,
          themeId: loadedTheme,
          isDefault: loadedTheme === 'default',
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch conversation theme from server:', err.message);
    } finally {
      setLoadingTheme(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchConversationTheme();
  }, [fetchConversationTheme]);

  // Listen for real-time Socket.IO chat:themeUpdated broadcast
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleThemeUpdated = ({ conversationId: updatedConvId, theme: newTheme }) => {
      if (String(updatedConvId) === String(conversationId)) {
        const validatedTheme = newTheme || 'default';
        setThemeState((prev) => ({
          ...prev,
          themeId: validatedTheme,
          isDefault: validatedTheme === 'default',
        }));
      }
    };

    socket.on('chat:themeUpdated', handleThemeUpdated);

    return () => {
      socket.off('chat:themeUpdated', handleThemeUpdated);
    };
  }, [socket, conversationId]);

  // Save shared conversation theme
  const saveTheme = async (newThemePayload) => {
    if (!conversationId) return { success: false, message: 'No active conversation' };
    try {
      const selectedTheme = typeof newThemePayload === 'string'
        ? newThemePayload
        : (newThemePayload?.theme || newThemePayload?.themeId || 'default');

      const res = await api.put(`/conversations/${conversationId}/theme`, {
        theme: selectedTheme,
      });

      if (res.data.success) {
        const savedTheme = res.data.theme || selectedTheme;
        setThemeState((prev) => ({
          ...prev,
          themeId: savedTheme,
          isDefault: savedTheme === 'default',
        }));

        // Keep local context synced
        if (setActiveConversation) {
          setActiveConversation((prev) =>
            prev && prev._id === conversationId ? { ...prev, theme: savedTheme } : prev
          );
        }
        if (setConversations) {
          setConversations((prev) =>
            prev.map((c) => (c._id === conversationId ? { ...c, theme: savedTheme } : c))
          );
        }

        // Update recents locally
        if (savedTheme && savedTheme !== 'default') {
          setRecentThemes((prev) => {
            const filtered = prev.filter((id) => id !== savedTheme);
            return [savedTheme, ...filtered].slice(0, 6);
          });
        }
        return { success: true, theme: savedTheme };
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
    if (!conversationId) return { success: false };
    try {
      const res = await api.delete(`/conversations/${conversationId}/theme`);
      if (res.data.success) {
        setThemeState((prev) => ({
          ...prev,
          themeId: 'default',
          isDefault: true,
        }));
        if (setActiveConversation) {
          setActiveConversation((prev) =>
            prev && prev._id === conversationId ? { ...prev, theme: 'default' } : prev
          );
        }
        if (setConversations) {
          setConversations((prev) =>
            prev.map((c) => (c._id === conversationId ? { ...c, theme: 'default' } : c))
          );
        }
        return { success: true };
      }
      return { success: false, message: res.data.message };
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

  // Determine active theme colors (Priority: Conversation Theme -> Global Appearance -> Built-in Default)
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
