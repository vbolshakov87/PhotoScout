import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { useAuth } from '../../contexts/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TabbedView } from './TabbedView';
import { PreviewTab } from './PreviewTab';
import { Camera, LogOut, User, Plus, Loader2, LogIn } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

const CITIES = ['Tokyo', 'Paris', 'New York', 'Lisbon', 'Bergen', 'Copenhagen', 'Rome', 'Amsterdam'];

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [displayedCities] = useState(() =>
    [...CITIES].sort(() => Math.random() - 0.5).slice(0, 6)
  );

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

  const handleCityClick = (city: string) => {
    haptic('light');
    sendMessage(`Photo trip to ${city}`);
  };

  const chatContent = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div
          className={`flex items-center gap-2 ${isGuest ? 'cursor-pointer' : ''}`}
          onClick={() => isGuest && navigate('/login')}
        >
          <img
            src="https://aiscout.photo/city-images/appicon.png"
            alt="PhotoScout"
            className="w-9 h-9 rounded-lg"
          />
          <h1 className="text-base font-semibold text-foreground">PhotoScout</h1>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => { haptic('light'); clearChat(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors press"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="press"
            >
              {user?.picture && !isGuest ? (
                <img
                  src={user.picture}
                  alt=""
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    // Hide broken image and show fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-card flex items-center justify-center ${user?.picture && !isGuest ? 'hidden' : ''}`}>
                <User className="w-4 h-4 text-muted" />
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-medium text-foreground truncate text-sm">{isGuest ? 'Guest' : user?.name}</p>
                    <p className="text-xs text-muted truncate">{isGuest ? 'Not signed in' : user?.email}</p>
                  </div>
                  {isGuest ? (
                    <div className="p-3">
                      <p className="text-xs text-muted mb-2 flex items-center gap-1">
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
                      onClick={() => { haptic('light'); logout(); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-2 text-danger text-sm hover:bg-white/5 press"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-6">
              <Camera className="w-8 h-8 text-muted" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
              Plan Your Photo Trip
            </h2>
            <p className="text-muted text-sm text-center mb-8 max-w-xs">
              Tell me a destination and I'll create an interactive guide with the best photography spots.
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {displayedCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className="px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground hover:bg-surface transition-colors press"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <MessageList messages={messages} onSend={handleSend} />

            {/* Processing indicator */}
            {generationProgress.isGenerating && (
              <div className="mt-4 p-4 bg-card border border-border rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Processing...</p>
                    <p className="text-xs text-muted">{generationProgress.stage}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2 text-right">{generationProgress.progress}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && !error.includes('environment variable') && (
        <div className="mx-4 mb-2 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={isLoading} />
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
