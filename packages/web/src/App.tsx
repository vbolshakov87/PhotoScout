import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatPage } from './pages/ChatPage';
import { ConversationPage } from './pages/ConversationPage';
import { TripsPage } from './pages/TripsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { BottomNav } from './components/navigation/BottomNav';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const { user, isNativeAuth } = useAuth();

  // Hide bottom nav on conversation detail pages, login page, or when in native app
  const shouldShowNav = user &&
                        !isNativeAuth &&
                        !location.pathname.startsWith('/conversation/') &&
                        !location.pathname.match(/^\/trips\/.+/) &&
                        location.pathname !== '/login';

  return (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="w-full h-full max-w-md max-h-[900px] flex flex-col bg-[#0a0a0f] overflow-hidden md:rounded-2xl md:shadow-2xl md:border md:border-white/10">
        <div className="flex-1 overflow-hidden">
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversation/:conversationId"
            element={
              <ProtectedRoute>
                <ConversationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:planId"
            element={
              <ProtectedRoute>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
        </div>
        {shouldShowNav && <BottomNav />}
      </div>
    </div>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return (
      <div className="flex items-center justify-center h-screen p-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-red-500 mb-2">Configuration Error</h1>
          <p className="text-gray-400">
            Missing VITE_GOOGLE_CLIENT_ID environment variable.
            <br />
            Please add it to your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
