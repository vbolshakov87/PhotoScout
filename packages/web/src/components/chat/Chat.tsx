import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { useAuth } from '../../contexts/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput, ChatInputHandle } from './ChatInput';
import { TabbedView } from './TabbedView';
import { PreviewTab } from './PreviewTab';
import { LogOut, User, Plus, Loader2, LogIn } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

const CITIES = [
  'Tokyo',
  'Paris',
  'New York',
  'Lisbon',
  'Bergen',
  'Copenhagen',
  'Rome',
  'Amsterdam',
  'Barcelona',
  'Prague',
  'Vienna',
  'Sydney',
];
const LOCATIONS = [
  'Dolomites',
  'Lofoten Islands',
  'Scottish Highlands',
  'Patagonia',
  'Swiss Alps',
  'Grand Canyon',
  'Faroe Islands',
  'Santorini',
];
const COUNTRIES = ['Iceland', 'Japan', 'New Zealand', 'Norway', 'Portugal', 'Croatia', 'Scotland'];

/**
 * Renders the main chat interface for PhotoScout, including header, user menu and sign-in, messages list, suggestions, processing state, error banner, and input.
 *
 * The component wires authentication, chat state, native haptic feedback, auto-scrolling, and handlers for sending messages, using suggestions, and clearing the conversation.
 *
 * @returns The chat view as a JSX element ready to be rendered inside the app layout.
 */
export function Chat() {
  const navigate = useNavigate();
  const { messages, isLoading, error, generationProgress, sendMessage, clearChat } = useChat();
  const { user, logout, isGuest, login } = useAuth();
  const { haptic } = useNativeBridge();

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
      setShowUserMenu(false);
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [suggestions] = useState(() => {
    const cities = [...CITIES].sort(() => Math.random() - 0.5).slice(0, 5);
    const locations = [...LOCATIONS].sort(() => Math.random() - 0.5).slice(0, 2);
    const countries = [...COUNTRIES].sort(() => Math.random() - 0.5).slice(0, 2);
    return [...cities, ...locations, ...countries].sort(() => Math.random() - 0.5);
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, generationProgress]);

  const handleSend = (message: string) => {
    haptic('light');
    sendMessage(message);
  };

  const handleCityClick = (place: string) => {
    haptic('light');
    sendMessage(
      `I am planning a photo trip to ${place} please help me to find the best photography spots and and the best time to visit them`
    );
  };

  const handleSuggest = (text: string) => {
    haptic('light');
    chatInputRef.current?.setValue(text);
  };

  const chatContent = (
    <div className="flex flex-col h-full glass-bg morphing-blobs">
      {/* Header */}
      <header className="relative flex items-center justify-between px-4 pt-3 pb-3 liquid-glass border-b border-white/10 z-20">
        <div
          className={`flex items-center gap-2.5 ${isGuest ? 'cursor-pointer' : ''}`}
          onClick={() => isGuest && navigate('/login')}
        >
          <img
            src="/appicon.png"
            alt="PhotoScout"
            className="w-10 h-10 rounded-xl shadow-lg shadow-amber-500/20 animate-float"
          />
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">PhotoScout</h1>
            <p className="text-white/40 text-[10px]">AI Travel Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                haptic('light');
                clearChat();
              }}
              className="w-9 h-9 rounded-xl liquid-glass glass-prismatic flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              <Plus className="w-4 h-4 text-white/70" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-xl liquid-glass glass-prismatic flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 overflow-hidden"
            >
              {user?.picture && !isGuest ? (
                <img
                  src={user.picture}
                  alt=""
                  className="w-full h-full rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`${user?.picture && !isGuest ? 'hidden' : ''}`}>
                <User className="w-4 h-4 text-white/70" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* User menu dropdown - outside header to escape backdrop-filter containing block */}
      {showUserMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          <div className="user-menu-dropdown">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="font-medium text-white truncate text-sm">
                {isGuest ? 'Guest' : user?.name}
              </p>
              <p className="text-xs text-white/50 truncate">
                {isGuest ? 'Not signed in' : user?.email}
              </p>
            </div>
            {isGuest ? (
              <div className="p-3">
                <p className="text-xs text-white/50 mb-2 flex items-center gap-1">
                  <LogIn className="w-3 h-3" /> Sign in to save trips
                </p>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error('Login failed')}
                  theme="outline"
                  size="medium"
                  text="signin_with"
                  shape="rectangular"
                  use_fedcm_for_prompt={false}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  haptic('light');
                  logout();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-red-400 text-sm hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto glass-scrollbar relative z-10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <img
              src="/appicon.png"
              alt="PhotoScout"
              className="w-16 h-16 rounded-2xl mb-6 animate-pulse-glow shadow-lg shadow-amber-500/30"
            />

            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Plan Your Photo Trip
            </h2>
            <p className="text-white/50 text-sm text-center mb-8 max-w-xs">
              Tell me a destination and I'll create an interactive guide with the best photography
              spots.
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleCityClick(suggestion)}
                  className={`px-4 py-2 liquid-glass glass-prismatic rounded-full text-sm text-white/90 hover:scale-105 active:scale-95 transition-all duration-200 animate-fade-in stagger-${Math.min(index + 1, 6)}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <MessageList messages={messages} onSend={handleSend} onSuggest={handleSuggest} />

            {/* Processing indicator */}
            {generationProgress.isGenerating && (
              <div className="mt-4 p-4 liquid-glass rounded-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      <div className="absolute inset-0 w-5 h-5 rounded-full bg-violet-400/20 animate-ping" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Processing...</p>
                      <p className="text-xs text-white/50">{generationProgress.stage}</p>
                    </div>
                  </div>
                  <span className="text-violet-300 text-sm font-semibold">
                    {generationProgress.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400 rounded-full animate-gradient transition-all duration-500"
                    style={{ width: `${generationProgress.progress}%` }}
                  />
                  <div className="absolute inset-0 animate-shimmer rounded-full" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && !error.includes('environment variable') && (
        <div className="mx-4 mb-2 px-4 py-3 liquid-glass bg-danger/10 border-danger/30 rounded-xl text-danger text-sm z-10">
          {error}
        </div>
      )}

      <ChatInput ref={chatInputRef} onSend={handleSend} disabled={isLoading} />
    </div>
  );

  return (
    <TabbedView
      chatContent={chatContent}
      previewContent={<PreviewTab messages={messages} />}
      messages={messages}
    />
  );
}