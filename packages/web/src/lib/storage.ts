import type { Message } from '@photoscout/shared';

const CONVERSATION_ID_KEY = 'photoscout_conversation_id';
const MESSAGES_KEY = 'photoscout_messages';

// Get userId from stored user data (set by AuthContext)
// For native app, userId comes from URL params or native auth storage
export function getUserId(): string {
  // Check URL params first (for native app)
  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId = urlParams.get('userId') || urlParams.get('visitorId');
  if (urlUserId) {
    return urlUserId;
  }

  // Check native auth storage (set by AuthContext for iOS app)
  const nativeAuth = localStorage.getItem('photoscout_native_auth');
  if (nativeAuth) {
    try {
      const user = JSON.parse(nativeAuth);
      if (user.userId) {
        return user.userId;
      }
    } catch (error) {
      console.error('Error parsing native auth:', error);
    }
  }

  // For web app, get userId from stored user data
  const storedUser = localStorage.getItem('photoscout_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.userId;
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
  }

  throw new Error('User not authenticated');
}

export function getConversationId(): string | null {
  return localStorage.getItem(CONVERSATION_ID_KEY);
}

export function setConversationId(id: string): void {
  localStorage.setItem(CONVERSATION_ID_KEY, id);
}

export function clearConversation(): void {
  localStorage.removeItem(CONVERSATION_ID_KEY);
  localStorage.removeItem(MESSAGES_KEY);
}

// Messages persistence
export function getStoredMessages(): Message[] {
  const stored = localStorage.getItem(MESSAGES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored messages:', error);
    }
  }
  return [];
}

export function setStoredMessages(messages: Message[]): void {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}
