import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { ConversationPage } from './pages/ConversationPage';

function App() {
  return (
    <BrowserRouter>
      <div className="h-full flex flex-col">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/conversation/:conversationId" element={<ConversationPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
