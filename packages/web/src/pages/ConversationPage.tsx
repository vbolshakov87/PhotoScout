import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MessageList } from '../components/chat/MessageList';
import type { Message } from '@photoscout/shared';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const visitorId = searchParams.get('visitorId') || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversation() {
      if (!conversationId || !visitorId) return;

      try {
        console.log('Loading conversation:', conversationId, visitorId);
        const response = await fetch(
          `${API_BASE}/conversations/${conversationId}?visitorId=${visitorId}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setMessages(data.messages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        setError('Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    }

    loadConversation();
  }, [conversationId, visitorId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-card border border-border rounded-lg text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        <MessageList messages={messages} />
      </div>
    </div>
  );
}
