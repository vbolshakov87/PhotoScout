import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Conversation } from '@photoscout/shared';
import { ConversationCard } from '../components/history/ConversationCard';
import { getVisitorId, setConversationId } from '../lib/storage';

export function HistoryPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const visitorId = getVisitorId();

        const response = await fetch(`/api/conversations?visitorId=${visitorId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        const convs = data.items || [];
        setConversations(convs);
        setFilteredConversations(convs);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Filter conversations by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter((conv) => {
      return (
        conv.title.toLowerCase().includes(query) ||
        conv.city?.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
      );
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleConversationClick = (conversation: Conversation) => {
    // Set the conversation ID in storage
    setConversationId(conversation.conversationId);

    // Navigate to chat page
    navigate('/');

    // Trigger reload of conversation (handled by Chat component)
    if (window.loadConversation) {
      window.loadConversation(conversation.conversationId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-background">
        <h1 className="text-2xl font-bold mb-3">Chat History</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by city or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <p className="text-sm text-gray-400 mt-3">
          {filteredConversations.length}{' '}
          {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
          {searchQuery && ' found'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading conversations...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-gray-400 mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? 'Try a different search term'
                : 'Start a new chat to create your first conversation'}
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
