import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@photoscout/shared';
import { streamChat } from '../lib/api';
import {
  getUserId,
  getConversationId,
  setConversationId,
  clearConversation,
  getStoredMessages,
  setStoredMessages,
} from '../lib/storage';

export interface GenerationProgress {
  isGenerating: boolean;
  progress: number; // 0-100
  stage: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(() => getStoredMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    isGenerating: false,
    progress: 0,
    stage: '',
  });

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      setStoredMessages(messages);
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    let visitorId: string;
    try {
      visitorId = getUserId();
    } catch (_e) {
      setError('Not authenticated');
      return;
    }
    const conversationId = getConversationId() || uuidv4();

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
    let isGeneratingHtml = false;

    try {
      for await (const event of streamChat({
        visitorId,
        conversationId,
        message: content,
      })) {
        if (event.type === 'delta' && event.content) {
          assistantContent += event.content;

          // Check if we're receiving JSON (HTML generation in progress)
          const trimmedContent = assistantContent.trim();
          const looksLikeJson = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');

          if (looksLikeJson && !isGeneratingHtml) {
            isGeneratingHtml = true;
            setGenerationProgress({
              isGenerating: true,
              progress: 10,
              stage: 'Analyzing your request...',
            });
          }

          // Update progress based on JSON content hints
          if (isGeneratingHtml) {
            if (assistantContent.includes('"spots"')) {
              setGenerationProgress({
                isGenerating: true,
                progress: 30,
                stage: 'Finding photography spots...',
              });
            }
            if (assistantContent.includes('"routes"') || assistantContent.includes('"route"')) {
              setGenerationProgress({
                isGenerating: true,
                progress: 50,
                stage: 'Planning routes...',
              });
            }
            if (assistantContent.includes('"schedule"') || assistantContent.includes('"timing"')) {
              setGenerationProgress({
                isGenerating: true,
                progress: 70,
                stage: 'Optimizing schedule...',
              });
            }
          }

          // Only show content if it's not JSON
          if (!isGeneratingHtml) {
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === assistantMessageId);
              if (existing) {
                return prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
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
                  isHtml: false,
                },
              ];
            });
          }
        } else if (event.type === 'html' && event.content) {
          // HTML received - update progress and replace content
          setGenerationProgress({
            isGenerating: true,
            progress: 90,
            stage: 'Generating interactive map...',
          });

          assistantContent = event.content;
          isGeneratingHtml = false;

          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== assistantMessageId);
            return [
              ...filtered,
              {
                id: assistantMessageId,
                visitorId,
                conversationId,
                timestamp: Date.now(),
                role: 'assistant',
                content: assistantContent,
                isHtml: true,
              },
            ];
          });

          setGenerationProgress({
            isGenerating: false,
            progress: 100,
            stage: 'Complete!',
          });
        } else if (event.type === 'done') {
          if (event.conversationId) {
            setConversationId(event.conversationId);
          }
          setGenerationProgress({
            isGenerating: false,
            progress: 0,
            stage: '',
          });
        } else if (event.type === 'error') {
          setError(event.error || 'Unknown error');
          setGenerationProgress({
            isGenerating: false,
            progress: 0,
            stage: '',
          });
        }
      }

      // Ensure assistant message exists even if no content was received
      if (assistantContent.length === 0) {
        setError('No response received from server');
      } else if (!isGeneratingHtml) {
        // Make sure the final message is in the list (for non-HTML responses)
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === assistantMessageId);
          if (!existing) {
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
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Chat error:', e);
      setError(e instanceof Error ? e.message : 'Failed to send message');
      setGenerationProgress({
        isGenerating: false,
        progress: 0,
        stage: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    clearConversation();
  }, []);

  return {
    messages,
    isLoading,
    error,
    generationProgress,
    sendMessage,
    clearChat,
  };
}
