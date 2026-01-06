export interface Message {
  id: string;
  visitorId: string;
  conversationId: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean;
  model?: string;
  tokenCount?: number;
  city?: string;
}

export interface Conversation {
  conversationId: string;
  visitorId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  city?: string;
  messageCount: number;
  lastMessage?: string;
}

export interface Plan {
  planId: string;
  visitorId: string;
  conversationId: string;
  createdAt: number;
  city: string;
  title: string;
  htmlContent: string;
  thumbnail?: string; // Base64 or URL for plan preview
  spotCount: number;
}

export interface ChatRequest {
  visitorId: string;
  conversationId?: string;
  message: string;
}

export interface ChatStreamEvent {
  type: 'delta' | 'done' | 'error' | 'plan_saved';
  content?: string;
  conversationId?: string;
  messageId?: string;
  planId?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// API Request/Response types
export interface ListConversationsRequest {
  visitorId: string;
  limit?: number;
  cursor?: string;
}

export interface ListPlansRequest {
  visitorId: string;
  limit?: number;
  cursor?: string;
}

export interface GetConversationRequest {
  visitorId: string;
  conversationId: string;
}

export interface GetPlanRequest {
  visitorId: string;
  planId: string;
}

export interface DeletePlanRequest {
  visitorId: string;
  planId: string;
}

// Native bridge types
export interface NativeBridge {
  share: (content: string, title?: string) => void;
  haptic: (style: 'light' | 'medium' | 'heavy') => void;
  copyToClipboard: (text: string) => void;
  openPlan: (planId: string) => void;
  openConversation: (conversationId: string) => void;
  navigateToTab: (tab: 'chat' | 'plans' | 'history') => void;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        nativeBridge?: {
          postMessage: (message: NativeBridgeMessage) => void;
        };
      };
    };
    nativeReady?: () => void;
    loadConversation?: (conversationId: string) => void;
  }
}

export interface NativeBridgeMessage {
  action: 'share' | 'haptic' | 'copyToClipboard' | 'openPlan' | 'openConversation' | 'navigateToTab';
  payload: unknown;
}
