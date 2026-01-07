import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { ConversationPage } from './pages/ConversationPage';
import { TripsPage } from './pages/TripsPage';
import { HistoryPage } from './pages/HistoryPage';
import { BottomNav } from './components/navigation/BottomNav';

function AppContent() {
  const location = useLocation();

  // Hide bottom nav on conversation detail pages
  const shouldShowNav = !location.pathname.startsWith('/conversation/') &&
                        !location.pathname.match(/^\/trips\/.+/);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/conversation/:conversationId" element={<ConversationPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:planId" element={<TripsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
      {shouldShowNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
