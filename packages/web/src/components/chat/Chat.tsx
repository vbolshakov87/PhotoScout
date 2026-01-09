import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { useAuth } from '../../contexts/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TabbedView } from './TabbedView';
import { PreviewTab } from './PreviewTab';
import { Camera, LogOut, User } from 'lucide-react';

export function Chat() {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const { user, logout } = useAuth();
  const { haptic } = useNativeBridge();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = (message: string) => {
    haptic('light');
    sendMessage(message);
  };

  const handleLogout = () => {
    haptic('light');
    logout();
  };

  // Chat Tab Content
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Photo scout</h1>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              New Trip
            </button>
          )}
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-white/10 rounded-lg shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="font-medium truncate">{user?.name}</p>
                  <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-white/5 transition-colors text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Camera className="w-16 h-16 text-primary mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2">Plan Your Photo Trip</h2>
            <p className="text-gray-400 mb-6">
              Tell me a city, region, seasite or mountains you want to visit and I'll create an interactive map with the best
              photography spots, optimal timing, and walking routes. I'll also give you tips on what to shoot and how to get there.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Tokyo', 'Lisbon', 'Bergen', 'North Denmark', 'Normandy', 'Amsterdam', 'Brussels', 'Copenhagen', 'Dublin', 'Edinburgh', 'Frankfurt', 'Geneva', 'Hamburg', 'Lisbon', 'Lyon', 'Madrid', 'Marseille', 'Milan', 'Munich', 'Naples', 'Oslo', 'Paris', 'Prague', 'Rome', 'Stockholm', 'Vienna', 'Zurich'].sort((a, b) => Math.random() - 0.5).slice(0, 10).map((city) => (
                <button
                  key={city}
                  onClick={() => handleSend(`Photo trip to ${city} this weekend, I'm interested in architecture, street, landscapes, night`)}
                  className="px-4 py-2 bg-card rounded-full text-sm hover:bg-white/10 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );

  // Preview Tab Content
  const previewContent = <PreviewTab messages={messages} />;

  return (
    <TabbedView
      chatContent={chatContent}
      previewContent={previewContent}
      messages={messages}
    />
  );
}
