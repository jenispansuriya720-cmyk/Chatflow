import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Sparkles,
  Star,
  RotateCcw,
  Check,
  Search,
  Upload,
  Sliders,
  Palette,
  AlertTriangle,
  Type,
  Maximize2,
  Minimize2,
  Layers,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  BUILT_IN_THEMES,
  THEME_CATEGORIES,
  PRESET_WALLPAPERS,
  BUBBLE_STYLES,
  FONT_SIZES,
  DENSITIES,
  getThemeById,
} from '../../../constants/chatThemes';
import { useChatTheme } from '../../../context/ChatThemeContext';
import { useToast } from '../../common/Toast';
import { isContrastAdequate, getOptimalTextColor, getContrastRatio } from '../../../utils/contrast';
import Avatar from '../../common/Avatar';

const ChatThemePanel = ({ isOpen, onClose, conversationName = 'Taylor Reed', conversationAvatar }) => {
  const {
    themeState,
    resolvedTheme,
    bubbleStyle: activeBubbleStyle,
    fontSize: activeFontSize,
    density: activeDensity,
    saveTheme,
    resetTheme,
    favorites,
    toggleFavorite,
    recentThemes,
  } = useChatTheme();

  const { addToast } = useToast();

  // Active tab: 'presets' | 'customize'
  const [activeTab, setActiveTab] = useState('presets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Draft customization state
  const [draftTheme, setDraftTheme] = useState(() => ({
    themeType: themeState.themeType || 'preset',
    themeId: themeState.themeId || 'default',
    bubbleStyle: activeBubbleStyle || 'classic',
    fontSize: activeFontSize || 'medium',
    density: activeDensity || 'comfortable',
    backgroundEffect: themeState.backgroundEffect || 'none',
    customTheme: themeState.customTheme ? { ...themeState.customTheme } : { ...resolvedTheme },
  }));

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Sync draft state when panel opens
  useEffect(() => {
    if (isOpen) {
      setDraftTheme({
        themeType: themeState.themeType || 'preset',
        themeId: themeState.themeId || 'default',
        bubbleStyle: activeBubbleStyle || 'classic',
        fontSize: activeFontSize || 'medium',
        density: activeDensity || 'comfortable',
        backgroundEffect: themeState.backgroundEffect || 'none',
        customTheme: themeState.customTheme ? { ...themeState.customTheme } : { ...resolvedTheme },
      });
      setHasChanges(false);
    }
  }, [isOpen, themeState, activeBubbleStyle, activeFontSize, activeDensity, resolvedTheme]);

  // Compute live preview colors based on draft
  const previewColors = useMemo(() => {
    if (draftTheme.themeType === 'custom' && draftTheme.customTheme) {
      return {
        ...draftTheme.customTheme,
        name: 'Custom Theme',
      };
    }
    const preset = getThemeById(draftTheme.themeId);
    return {
      ...preset,
      ...(draftTheme.customTheme?.wallpaper ? { wallpaper: draftTheme.customTheme.wallpaper } : {}),
      ...(draftTheme.customTheme?.wallpaperOpacity ? { wallpaperOpacity: draftTheme.customTheme.wallpaperOpacity } : {}),
    };
  }, [draftTheme]);

  // Contrast check between text and bubble colors
  const incomingContrastAdequate = useMemo(() => {
    return isContrastAdequate(previewColors.incomingText, previewColors.incomingBubble);
  }, [previewColors.incomingText, previewColors.incomingBubble]);

  const outgoingContrastAdequate = useMemo(() => {
    return isContrastAdequate(previewColors.outgoingText, previewColors.outgoingBubble);
  }, [previewColors.outgoingText, previewColors.outgoingBubble]);

  const showContrastWarning = !incomingContrastAdequate || !outgoingContrastAdequate;

  // Improve contrast helper
  const handleAutoImproveContrast = () => {
    const optimalIncomingText = getOptimalTextColor(previewColors.incomingBubble);
    const optimalOutgoingText = getOptimalTextColor(previewColors.outgoingBubble);

    setDraftTheme((prev) => ({
      ...prev,
      themeType: 'custom',
      customTheme: {
        ...(prev.customTheme || previewColors),
        incomingText: optimalIncomingText,
        outgoingText: optimalOutgoingText,
      },
    }));
    setHasChanges(true);
    addToast('Contrast enhanced for optimal readability', 'info');
  };

  // Select a preset theme
  const handleSelectPreset = (themeId) => {
    const preset = getThemeById(themeId);
    setDraftTheme((prev) => ({
      ...prev,
      themeType: 'preset',
      themeId,
      customTheme: { ...preset },
    }));
    setHasChanges(true);
  };

  // Custom color updater
  const handleColorChange = (field, value) => {
    setDraftTheme((prev) => ({
      ...prev,
      themeType: 'custom',
      customTheme: {
        ...(prev.customTheme || previewColors),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Wallpaper upload handler
  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      addToast('Please upload a JPG, PNG, or WebP image.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      setDraftTheme((prev) => ({
        ...prev,
        customTheme: {
          ...(prev.customTheme || previewColors),
          wallpaper: dataUrl,
          wallpaperOpacity: prev.customTheme?.wallpaperOpacity || 80,
        },
      }));
      setHasChanges(true);
      addToast('Wallpaper loaded into preview', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await saveTheme(draftTheme);
      if (res.success) {
        setHasChanges(false);
        addToast('Chat theme saved successfully!', 'success');
        onClose();
      } else {
        addToast(res.message || 'Failed to save theme', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    try {
      setIsSaving(true);
      await resetTheme();
      setShowResetConfirm(false);
      addToast('Chat theme reset to default', 'info');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Safe close with unsaved changes prompt
  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };

  // Filtered themes list
  const filteredThemes = useMemo(() => {
    return BUILT_IN_THEMES.filter((theme) => {
      const matchesSearch =
        theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Favorites') return favorites.includes(theme.id);
      return theme.category === selectedCategory;
    });
  }, [searchQuery, selectedCategory, favorites]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      {/* Drawer Container (full screen on mobile, 460px right side panel on desktop) */}
      <div
        className="w-full sm:max-w-md md:max-w-lg h-full sm:h-[92vh] sm:rounded-3xl bg-white dark:bg-dark-card border-l sm:border border-slate-200 dark:border-dark-border shadow-2xl flex flex-col overflow-hidden animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-dark-border flex items-center justify-between bg-white dark:bg-dark-surface flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chat Theme</h3>
              <p className="text-[10px] text-slate-500 dark:text-dark-muted">
                Personalized only for this chat with {conversationName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-500 hover:text-slate-700 dark:text-dark-muted transition-colors"
              title="Reset to default theme"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-500 hover:text-slate-700 dark:text-dark-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ========================================================
              1. REALISTIC LIVE PREVIEW (Requirement 7 & 38)
             ======================================================== */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                {previewColors.name}
              </span>
            </div>

            <div
              className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-dark-border shadow-md"
              style={{
                backgroundColor: previewColors.background,
                backgroundImage: previewColors.wallpaper
                  ? `url("${previewColors.wallpaper}")`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Wallpaper Opacity Overlay / Scrim */}
              {previewColors.wallpaper && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: previewColors.background,
                    opacity: 1 - (previewColors.wallpaperOpacity || 80) / 100,
                  }}
                />
              )}

              {/* Inner Preview Chrome */}
              <div className="relative z-10 p-3 flex flex-col space-y-3">
                {/* Header preview */}
                <div
                  className="px-3 py-2 rounded-xl flex items-center justify-between border shadow-xs"
                  style={{
                    backgroundColor: previewColors.headerBackground,
                    borderColor: previewColors.borderColor,
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Avatar
                      src={conversationAvatar}
                      name={conversationName}
                      size="xs"
                      status="online"
                    />
                    <div>
                      <p className="text-xs font-bold leading-none text-slate-900 dark:text-white">
                        {conversationName}
                      </p>
                      <p className="text-[9px] text-emerald-500 font-medium">Online</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: previewColors.primaryAccent }} />
                </div>

                {/* Messages preview */}
                <div className="space-y-2 py-1">
                  {/* Incoming */}
                  <div className="flex items-end space-x-1.5 justify-start">
                    <Avatar
                      src={conversationAvatar}
                      name={conversationName}
                      size="xs"
                      className="mb-0.5"
                    />
                    <div
                      className="max-w-[78%] px-3 py-1.5 shadow-xs border text-xs"
                      style={{
                        backgroundColor: previewColors.incomingBubble,
                        color: previewColors.incomingText,
                        borderColor: previewColors.borderColor,
                        borderRadius:
                          draftTheme.bubbleStyle === 'soft'
                            ? '1.25rem 1.25rem 1.25rem 0.35rem'
                            : draftTheme.bubbleStyle === 'compact'
                            ? '0.625rem 0.625rem 0.625rem 0.15rem'
                            : '1rem 1rem 1rem 0.25rem',
                      }}
                    >
                      <p className="leading-snug">Hi! How's your day going? 👋</p>
                      <span
                        className="text-[9px] block text-right mt-0.5 opacity-70"
                        style={{ color: previewColors.timestampColor }}
                      >
                        11:42 AM
                      </span>
                    </div>
                  </div>

                  {/* Outgoing */}
                  <div className="flex items-end justify-end">
                    <div
                      className="max-w-[78%] px-3 py-1.5 shadow-xs text-xs"
                      style={{
                        background: previewColors.outgoingBubble,
                        color: previewColors.outgoingText,
                        borderRadius:
                          draftTheme.bubbleStyle === 'soft'
                            ? '1.25rem 1.25rem 0.35rem 1.25rem'
                            : draftTheme.bubbleStyle === 'compact'
                            ? '0.625rem 0.625rem 0.15rem 0.625rem'
                            : '1rem 1rem 0.25rem 1rem',
                      }}
                    >
                      <p className="leading-snug">Loving this new chat theme! ✨</p>
                      <span
                        className="text-[9px] block text-right mt-0.5 opacity-80"
                        style={{ color: previewColors.outgoingText }}
                      >
                        11:43 AM ✓✓
                      </span>
                    </div>
                  </div>

                  {/* Typing Indicator preview */}
                  <div className="flex items-center space-x-1.5 px-2 text-[10px] text-slate-500">
                    <span>{conversationName.split(' ')[0]} is typing</span>
                    <span className="inline-flex space-x-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: previewColors.primaryAccent }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]"
                        style={{ backgroundColor: previewColors.primaryAccent }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]"
                        style={{ backgroundColor: previewColors.primaryAccent }}
                      />
                    </span>
                  </div>
                </div>

                {/* Input Bar preview */}
                <div
                  className="px-3 py-1.5 rounded-xl border flex items-center space-x-2 shadow-xs"
                  style={{
                    backgroundColor: previewColors.inputBackground,
                    borderColor: previewColors.borderColor,
                  }}
                >
                  <span
                    className="text-xs flex-1 truncate"
                    style={{ color: previewColors.inputPlaceholder }}
                  >
                    Type a message...
                  </span>
                  <div
                    className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: previewColors.primaryAccent }}
                  >
                    <Send className="w-3 h-3 ml-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contrast Accessibility Warning (Requirement 27) */}
            {showContrastWarning && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 animate-slide-up">
                <div className="flex items-center space-x-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span className="text-[11px] truncate">
                    This color combination may be difficult to read.
                  </span>
                </div>
                <button
                  onClick={handleAutoImproveContrast}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex-shrink-0 transition-colors ml-2"
                >
                  Improve Contrast
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              2. TAB SWITCHER: PRESETS vs CUSTOM
             ======================================================== */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-dark-surface p-1 border border-slate-200 dark:border-dark-border">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Themes & Presets</span>
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'customize'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Customize Details</span>
            </button>
          </div>

          {/* ========================================================
              TAB A: PRESET THEMES GRID (Requirement 4 & 25)
             ======================================================== */}
          {activeTab === 'presets' && (
            <div className="space-y-3.5">
              {/* Recently used row if available */}
              {recentThemes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Recently Used
                  </span>
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {recentThemes.map((rId) => {
                      const themeObj = getThemeById(rId);
                      return (
                        <button
                          key={rId}
                          onClick={() => handleSelectPreset(rId)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 flex-shrink-0 transition-all ${
                            draftTheme.themeId === rId
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600'
                              : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: themeObj.outgoingBubble }}
                          />
                          <span>{themeObj.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search themes by name or style..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {THEME_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 transition-all ${
                        selectedCategory === cat
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-dark-hover text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Miniature Cards Grid (Requirement 38) */}
              <div className="grid grid-cols-2 gap-2.5">
                {filteredThemes.map((theme) => {
                  const isSelected = draftTheme.themeId === theme.id;
                  const isFav = favorites.includes(theme.id);

                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleSelectPreset(theme.id)}
                      className={`relative group rounded-2xl border-2 p-2.5 cursor-pointer transition-all flex flex-col justify-between space-y-2 select-none hover:scale-[1.02] ${
                        isSelected
                          ? 'border-brand-500 shadow-md ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-dark-border hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: theme.background }}
                    >
                      {/* Favorite star toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(theme.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                      >
                        <Star
                          className={`w-3 h-3 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
                        />
                      </button>

                      {/* Card Header & Miniature Chat Representation */}
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.primaryAccent }}
                          />
                          <span
                            className="text-xs font-bold truncate max-w-[100px]"
                            style={{ color: theme.incomingText }}
                          >
                            {theme.name}
                          </span>
                        </div>

                        {/* Miniature incoming & outgoing bubble bars */}
                        <div className="space-y-1 p-1.5 rounded-lg bg-black/10">
                          <div
                            className="w-3/4 h-2.5 rounded-full shadow-2xs"
                            style={{ backgroundColor: theme.incomingBubble }}
                          />
                          <div
                            className="w-2/3 h-2.5 rounded-full ml-auto shadow-2xs"
                            style={{ background: theme.outgoingBubble }}
                          />
                        </div>
                      </div>

                      {/* Selected check badge */}
                      {isSelected && (
                        <div className="flex items-center space-x-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 pt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB B: CUSTOMIZE DETAILS (Requirements 8, 9, 11, 12, 13)
             ======================================================== */}
          {activeTab === 'customize' && (
            <div className="space-y-4 text-xs">
              {/* 1. Wallpaper upload & presets (Requirement 9) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Chat Wallpaper
                  </span>
                  {previewColors.wallpaper && (
                    <button
                      onClick={() => handleColorChange('wallpaper', '')}
                      className="text-[10px] text-rose-500 font-semibold flex items-center space-x-1 hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Presets and Upload button */}
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleWallpaperUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl border border-dashed border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  {PRESET_WALLPAPERS.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => handleColorChange('wallpaper', wp.url)}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-brand-500 text-[11px] font-medium transition-colors"
                    >
                      {wp.name}
                    </button>
                  ))}
                </div>

                {/* Wallpaper Opacity Slider (Requirement 9) */}
                {previewColors.wallpaper && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <span>Wallpaper Opacity</span>
                      <span>{previewColors.wallpaperOpacity || 80}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={previewColors.wallpaperOpacity || 80}
                      onChange={(e) =>
                        handleColorChange('wallpaperOpacity', Number(e.target.value))
                      }
                      className="w-full accent-brand-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* 2. Bubble Style Selector (Requirement 11) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Bubble Style
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUBBLE_STYLES.map((bs) => (
                    <button
                      key={bs.id}
                      onClick={() => {
                        setDraftTheme((prev) => ({ ...prev, bubbleStyle: bs.id }));
                        setHasChanges(true);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        draftTheme.bubbleStyle === bs.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-600'
                          : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-bold block text-xs">{bs.name}</span>
                      <span className="text-[10px] text-slate-400 block">{bs.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Font Size & Density (Requirements 12 & 13) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Font Size */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Text Size
                  </span>
                  <div className="flex space-x-1.5">
                    {FONT_SIZES.map((fs) => (
                      <button
                        key={fs.id}
                        onClick={() => {
                          setDraftTheme((prev) => ({ ...prev, fontSize: fs.id }));
                          setHasChanges(true);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-center border transition-all text-xs ${
                          draftTheme.fontSize === fs.id
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {fs.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Chat Density
                  </span>
                  <div className="flex space-x-1.5">
                    {DENSITIES.map((ds) => (
                      <button
                        key={ds.id}
                        onClick={() => {
                          setDraftTheme((prev) => ({ ...prev, density: ds.id }));
                          setHasChanges(true);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-center border transition-all text-xs ${
                          draftTheme.density === ds.id
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ds.name.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Color Palette Customization (Requirement 8) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Theme Colors
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Background */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Chat Background</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={previewColors.background.startsWith('#') ? previewColors.background : '#ffffff'}
                        onChange={(e) => handleColorChange('background', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <span className="text-xs font-mono">{previewColors.background}</span>
                    </div>
                  </div>

                  {/* Accent */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={previewColors.primaryAccent.startsWith('#') ? previewColors.primaryAccent : '#4f46e5'}
                        onChange={(e) => handleColorChange('primaryAccent', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <span className="text-xs font-mono">{previewColors.primaryAccent}</span>
                    </div>
                  </div>

                  {/* Incoming Bubble */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Incoming Bubble</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={previewColors.incomingBubble.startsWith('#') ? previewColors.incomingBubble : '#ffffff'}
                        onChange={(e) => handleColorChange('incomingBubble', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <span className="text-xs font-mono">{previewColors.incomingBubble}</span>
                    </div>
                  </div>

                  {/* Outgoing Bubble */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Outgoing Bubble</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={previewColors.outgoingBubble.startsWith('#') ? previewColors.outgoingBubble : '#4f46e5'}
                        onChange={(e) => handleColorChange('outgoingBubble', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <span className="text-xs font-mono">
                        {previewColors.outgoingBubble.startsWith('#') ? previewColors.outgoingBubble : 'Gradient'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
          >
            Reset to Default
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/25 disabled:opacity-50 transition-all flex items-center space-x-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discard Unsaved Changes Modal (Requirement 22) */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-2xl space-y-4 text-center animate-scale-in">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Unsaved Changes</h4>
            <p className="text-xs text-slate-500 dark:text-dark-muted leading-relaxed">
              You have unsaved customizations. Do you want to discard your changes?
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDiscardModal(false);
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal (Requirement 21) */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-2xl space-y-4 text-center animate-scale-in">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reset Chat Theme?</h4>
            <p className="text-xs text-slate-500 dark:text-dark-muted leading-relaxed">
              This will remove your personal customization for this conversation and return to the default appearance.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatThemePanel;
