import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TabbedView } from './TabbedView';
import { PreviewTab } from './PreviewTab';
import { Camera } from 'lucide-react';

export function Chat() {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const { haptic } = useNativeBridge();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Chat Tab Content
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Photo scout</h1>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            New Trip
          </button>
        )}
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
              {['Hamburg', 'Tokyo', 'Lisbon', 'Bergen'].map((city) => (
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
