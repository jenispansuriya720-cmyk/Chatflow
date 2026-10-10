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

// Lazy-loaded Pages for Route-Based Code Splitting
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const HomePage = React.lazy(() => import('./pages/home/HomePage'));
const ReelsPage = React.lazy(() => import('./pages/reels/ReelsPage'));
const ExplorePage = React.lazy(() => import('./pages/explore/ExplorePage'));
const LiveHubPage = React.lazy(() => import('./pages/live/LiveHubPage'));
const LiveBroadcastPage = React.lazy(() => import('./pages/live/LiveBroadcastPage'));
const LiveWatchPage = React.lazy(() => import('./pages/live/LiveWatchPage'));
const SocialProfilePage = React.lazy(() => import('./pages/profile/SocialProfilePage'));
const WelcomePage = React.lazy(() => import('./pages/auth/WelcomePage'));
const OnboardingPage = React.lazy(() => import('./pages/auth/OnboardingPage'));
const LandingPage = React.lazy(() => import('./pages/public/LandingPage'));
const PublicInfoPage = React.lazy(() => import('./pages/public/PublicInfoPage'));
const SafetyCenterPage = React.lazy(() => import('./pages/safety/SafetyCenterPage'));
const CreatorDashboardPage = React.lazy(() => import('./pages/creator/CreatorDashboardPage'));
const PeoplePage = React.lazy(() => import('./pages/people/PeoplePage'));
const SavedPage = React.lazy(() => import('./pages/saved/SavedPage'));
const ChatDashboard = React.lazy(() => import('./pages/chat/ChatDashboard'));
const ContactsPage = React.lazy(() => import('./pages/contacts/ContactsPage'));
const CreateGroupPage = React.lazy(() => import('./pages/groups/CreateGroupPage'));
const NotificationsPage = React.lazy(() => import('./pages/notifications/NotificationsPage'));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));
const CallsPage = React.lazy(() => import('./pages/calls/CallsPage'));
const NotFoundPage = React.lazy(() => import('./pages/common/NotFoundPage'));

const RouteLoadingFallback = () => (
  <div className="h-screen h-dvh w-full flex items-center justify-center bg-white dark:bg-dark-base">
    <LoadingSpinner size="md" />
  </div>
);

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
                  <React.Suspense fallback={<RouteLoadingFallback />}>
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
                  </React.Suspense>
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
