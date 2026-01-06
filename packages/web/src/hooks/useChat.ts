import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@photoscout/shared';
import { streamChat } from '../lib/api';
import { getVisitorId, getConversationId, setConversationId } from '../lib/storage';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const visitorId = getVisitorId();
    let conversationId = getConversationId() || uuidv4();

    const userMessage: Message = {
      id: uuidv4(),
      visitorId,
      conversationId,
      timestamp: Date.now(),
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const assistantMessageId = uuidv4();
    let assistantContent = '';

    try {
      for await (const event of streamChat({
        visitorId,
        conversationId,
        message: content,
      })) {
        if (event.type === 'delta' && event.content) {
          assistantContent += event.content;

          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantMessageId);
            if (existing) {
              return prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: assistantContent }
                  : m
              );
            }
            return [
              ...prev,
              {
                id: assistantMessageId,
                visitorId,
                conversationId,
                timestamp: Date.now(),
                role: 'assistant',
                content: assistantContent,
                isHtml: assistantContent.includes('<!DOCTYPE html>'),
              },
            ];
          });
        } else if (event.type === 'done') {
          if (event.conversationId) {
            setConversationId(event.conversationId);
          }
        } else if (event.type === 'error') {
          setError(event.error || 'Unknown error');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
