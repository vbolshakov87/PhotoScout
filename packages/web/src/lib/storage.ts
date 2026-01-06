import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'photoscout_visitor_id';
const CONVERSATION_ID_KEY = 'photoscout_conversation_id';

export function getVisitorId(): string {
  // Check URL params first (for native app)
  const urlParams = new URLSearchParams(window.location.search);
  const urlVisitorId = urlParams.get('visitorId');
  if (urlVisitorId) {
    localStorage.setItem(VISITOR_ID_KEY, urlVisitorId);
    return urlVisitorId;
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = uuidv4();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
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
