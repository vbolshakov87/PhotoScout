import type { ChatRequest, ChatStreamEvent, Conversation, Plan, PaginatedResponse, Message } from '@photoscout/shared';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Get ID token from localStorage (set by AuthContext)
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Check if user is authenticated (web app)
  const idToken = localStorage.getItem('photoscout_id_token');
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  return headers;
}

// ============ Chat ============

export async function* streamChat(request: ChatRequest): AsyncGenerator<ChatStreamEvent> {
  console.log('API: Sending chat request to:', `${API_BASE}/chat`, request);

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  console.log('API: Response status:', response.status, 'headers:', response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API: Error response:', errorText);
    yield { type: 'error', error: `HTTP ${response.status}: ${errorText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error('API: No response body');
    yield { type: 'error', error: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let eventCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('API: Stream done, received', eventCount, 'events');
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    console.log('API: Received chunk:', chunk.substring(0, 100));
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as ChatStreamEvent;
          eventCount++;
          yield event;
        } catch (e) {
          console.error('API: Failed to parse event:', line, e);
        }
      }
    }
  }
}

// ============ Conversations ============

export async function listConversations(
  visitorId: string,
  cursor?: string
): Promise<PaginatedResponse<Conversation>> {
  const params = new URLSearchParams({ visitorId });
  if (cursor) params.append('cursor', cursor);

  const response = await fetch(`${API_BASE}/conversations?${params}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getConversation(
  visitorId: string,
  conversationId: string
): Promise<{ conversation: Conversation; messages: Message[] }> {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}?visitorId=${visitorId}`,
    { headers: getAuthHeaders() }
  );
  return response.json();
}

// ============ Plans ============

export async function listPlans(
  visitorId: string,
  cursor?: string
): Promise<PaginatedResponse<Omit<Plan, 'htmlContent'>>> {
  const params = new URLSearchParams({ visitorId });
  if (cursor) params.append('cursor', cursor);

  const response = await fetch(`${API_BASE}/plans?${params}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getPlan(visitorId: string, planId: string): Promise<Plan> {
  const response = await fetch(`${API_BASE}/plans/${planId}?visitorId=${visitorId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function deletePlan(visitorId: string, planId: string): Promise<void> {
  await fetch(`${API_BASE}/plans/${planId}?visitorId=${visitorId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}
