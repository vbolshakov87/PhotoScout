import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History, MessageSquare, Loader2, X } from 'lucide-react';
import type { Conversation } from '@photoscout/shared';
import { ConversationCard } from '../components/history/ConversationCard';
import { getUserId, setConversationId } from '../lib/storage';

export function HistoryPage() {
  const navigate = useNavigate();
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-border bg-surface">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">History</h1>
            <p className="text-xs text-muted">
              {isLoading ? 'Loading...' : `${filteredConversations.length} conversations`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {error && (
          <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MessageSquare className="w-12 h-12 text-muted/50 mb-4" />
            <p className="text-muted text-sm">
              {searchQuery ? 'No results found' : 'No conversations yet'}
            </p>
            <p className="text-muted/70 text-xs mt-1">
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
    </div>
  );
}
