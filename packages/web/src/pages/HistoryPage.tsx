import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MessageSquare, Loader2, X, LogIn } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import type { Conversation } from '@photoscout/shared';
import { ConversationCard } from '../components/history/ConversationCard';
import { getUserId, setConversationId } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

/**
 * Render the History page UI which displays and manages the user's conversation history.
 *
 * The component fetches the current visitor's conversations on mount, provides a search
 * field to filter conversations by title, city, or last message, shows loading and error
 * states, and gates history behind authentication. Successful Google sign-in is passed to
 * the app's login handler. Selecting a conversation persists its ID and navigates to the
 * main chat view (and triggers a global load if available).
 *
 * @returns The rendered History page as a JSX element
 */
export function HistoryPage() {
  const navigate = useNavigate();
  const { isGuest, login } = useAuth();

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
    }
  };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const visitorId = getUserId();
        const response = await fetch(`/api/conversations?visitorId=${visitorId}`);
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const data = await response.json();
        const convs = data.items || [];
        setConversations(convs);
        setFilteredConversations(convs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredConversations(
      conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(query) ||
          conv.city?.toLowerCase().includes(query) ||
          conv.lastMessage?.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, conversations]);

  const handleConversationClick = (conversation: Conversation) => {
    setConversationId(conversation.conversationId);
    navigate('/');
    if (window.loadConversation) {
      window.loadConversation(conversation.conversationId);
    }
  };

  return (
    <div className="flex flex-col h-full glass-bg morphing-blobs">
      {/* Header */}
      <header className="relative px-4 pt-4 pb-3 liquid-glass glass-reflection border-b border-white/10 z-10">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/appicon.png"
            alt="PhotoScout"
            className="w-10 h-10 rounded-xl shadow-lg shadow-amber-500/20"
          />
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">History</h1>
            <p className="text-xs text-white/40">
              {isLoading ? 'Loading...' : `${filteredConversations.length} conversations`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-violet-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 relative z-10">
        {error && (
          <div className="mb-4 px-4 py-3 liquid-glass bg-danger/10 border-danger/30 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        {isGuest ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center mb-4 animate-pulse-glow">
              <LogIn className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white text-sm font-medium">Sign in to see your history</p>
            <p className="text-white/50 text-xs mt-1 mb-4">
              Your conversations will be saved when you sign in
            </p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error('Login failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              use_fedcm_for_prompt={false}
            />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-violet-400/20 animate-ping" />
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white/70 text-sm">
              {searchQuery ? 'No results found' : 'No conversations yet'}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {searchQuery ? 'Try a different search' : 'Start chatting to see history here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.conversationId}
                conversation={conversation}
                onClick={() => handleConversationClick(conversation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with legal links */}
      <footer className="relative px-4 py-3 liquid-glass border-t border-white/10 text-center z-10">
        <div className="flex items-center justify-center gap-4 text-xs text-white/40">
          <Link to="/about" className="hover:text-white/60 transition-colors">
            About
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-white/60 transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-white/60 transition-colors">
            Privacy
          </Link>
        </div>
        <p className="text-[10px] text-white/30 mt-1">PhotoScout © 2026</p>
      </footer>
    </div>
  );
}
