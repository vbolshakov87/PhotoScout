const CONVERSATION_ID_KEY = 'photoscout_conversation_id';

// Get userId from stored user data (set by AuthContext)
// For native app, visitorId comes from URL params
export function getUserId(): string {
  // Check URL params first (for native app)
  const urlParams = new URLSearchParams(window.location.search);
  const urlVisitorId = urlParams.get('visitorId');
  if (urlVisitorId) {
    return urlVisitorId;
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
}
