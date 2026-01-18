/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  webkit?: {
    messageHandlers: {
      nativeBridge: {
        postMessage: (message: unknown) => void;
      };
    };
  };
  loadConversation?: (conversationId: string) => void;
}
