import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import CreateModal from '../modals/CreateModal';

/**
 * ChatFlow Production AppShell
 * Provides responsive multi-column layouts on desktop/tablet and a native-like
 * mobile shell with top header, fixed bottom navigation, and safe-area padding.
 */
const AppShell = ({
  children,
  title,
  headerRightAction,
  hideHeader = false,
  hideBottomNav = false,
  onOpenCreatePost,
  onOpenCreateStory,
  onOpenCreateReel,
  className = '',
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100">
      {/* Desktop / Tablet Left Sidebar Navigation */}
      <Sidebar
        onOpenCreatePost={onOpenCreatePost}
        onOpenCreateStory={onOpenCreateStory}
        onOpenCreateReel={onOpenCreateReel}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Top Header */}
        {!hideHeader && (
          <MobileHeader title={title} rightAction={headerRightAction} />
        )}

        {/* Responsive Content Area */}
        <main
          className={`flex-1 overflow-y-auto ${
            !hideHeader ? 'pt-14 md:pt-0' : ''
          } ${
            !hideBottomNav ? 'pb-[calc(3.85rem+env(safe-area-inset-bottom,0px))] md:pb-0' : ''
          } ${className}`}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {!hideBottomNav && (
          <MobileBottomNav onOpenCreate={() => setCreateModalOpen(true)} />
        )}
      </div>

      {/* Global Creation Hub Modal */}
      <CreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOpenCreatePost={onOpenCreatePost}
        onOpenCreateStory={onOpenCreateStory}
        onOpenCreateReel={onOpenCreateReel}
      />
    </div>
  );
};

export default AppShell;
export { AppShell };
