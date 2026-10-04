import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import CallModal from './components/calling/CallModal';
import { ToastProvider } from './components/common/Toast';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Pages - Social Features
import HomePage from './pages/home/HomePage';
import ReelsPage from './pages/reels/ReelsPage';
import ExplorePage from './pages/explore/ExplorePage';
import LiveHubPage from './pages/live/LiveHubPage';
import LiveBroadcastPage from './pages/live/LiveBroadcastPage';
import LiveWatchPage from './pages/live/LiveWatchPage';
import SocialProfilePage from './pages/profile/SocialProfilePage';
import WelcomePage from './pages/auth/WelcomePage';
import OnboardingPage from './pages/auth/OnboardingPage';

// Pages - Trust, Public & Creator Experience (Sections 5, 8, 19, 32, 35, 39)
import LandingPage from './pages/public/LandingPage';
import PublicInfoPage from './pages/public/PublicInfoPage';
import SafetyCenterPage from './pages/safety/SafetyCenterPage';
import CreatorDashboardPage from './pages/creator/CreatorDashboardPage';
import PeoplePage from './pages/people/PeoplePage';
import SavedPage from './pages/saved/SavedPage';

// Pages - Chat & System
import ChatDashboard from './pages/chat/ChatDashboard';
import ContactsPage from './pages/contacts/ContactsPage';
import CreateGroupPage from './pages/groups/CreateGroupPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import CallsPage from './pages/calls/CallsPage';
import NotFoundPage from './pages/common/NotFoundPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen h-dvh w-full max-w-full flex items-center justify-center bg-white dark:bg-dark-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Only Route Wrapper (redirects to /home if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen h-dvh w-full max-w-full flex items-center justify-center bg-white dark:bg-dark-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/home" replace />;
};

// Root Route (Marketing Landing for unauthenticated visitors, Home for logged-in users)
const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen h-dvh w-full max-w-full flex items-center justify-center bg-white dark:bg-dark-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <HomePage /> : <LandingPage />;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <ChatProvider>
              <CallProvider>
                <BrowserRouter>
                  <CallModal />
                  <Routes>
                  {/* Public Auth Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={<RegisterPage />}
                  />
                  <Route
                    path="/welcome"
                    element={
                      <PublicRoute>
                        <WelcomePage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Social Platform Routes */}
                  <Route path="/" element={<RootRoute />} />
                  <Route
                    path="/home"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/explore"
                    element={
                      <ProtectedRoute>
                        <ExplorePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reels"
                    element={
                      <ProtectedRoute>
                        <ReelsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/live"
                    element={
                      <ProtectedRoute>
                        <LiveHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/live/broadcast"
                    element={
                      <ProtectedRoute>
                        <LiveBroadcastPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/live/:id"
                    element={
                      <ProtectedRoute>
                        <LiveWatchPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <SocialProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/:userId"
                    element={
                      <ProtectedRoute>
                        <SocialProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Chat & Messaging Routes */}
                  <Route
                    path="/calls"
                    element={
                      <ProtectedRoute>
                        <CallsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chats"
                    element={
                      <ProtectedRoute>
                        <ChatDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:conversationId"
                    element={
                      <ProtectedRoute>
                        <ChatDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/messages"
                    element={
                      <ProtectedRoute>
                        <ChatDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/messages/:conversationId"
                    element={
                      <ProtectedRoute>
                        <ChatDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contacts"
                    element={
                      <ProtectedRoute>
                        <ContactsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/groups/create"
                    element={
                      <ProtectedRoute>
                        <CreateGroupPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/:category"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/people"
                    element={
                      <ProtectedRoute>
                        <PeoplePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/saved"
                    element={
                      <ProtectedRoute>
                        <SavedPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/safety"
                    element={
                      <ProtectedRoute>
                        <SafetyCenterPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/creator-dashboard"
                    element={
                      <ProtectedRoute>
                        <CreatorDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Public Marketing & Trust Pages (Section 5 & 39) */}
                  <Route path="/about" element={<PublicInfoPage defaultSection="about" />} />
                  <Route path="/features" element={<PublicInfoPage defaultSection="features" />} />
                  <Route path="/terms" element={<PublicInfoPage defaultSection="terms" />} />
                  <Route path="/community-guidelines" element={<PublicInfoPage defaultSection="community-guidelines" />} />
                  <Route path="/help" element={<PublicInfoPage defaultSection="help" />} />
                  <Route path="/contact" element={<PublicInfoPage defaultSection="contact" />} />
                  <Route path="/privacy" element={<PublicInfoPage defaultSection="terms" />} />

                  {/* 404 Catch-All */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </CallProvider>
          </ChatProvider>
        </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
