import type { Message } from '@photoscout/shared';
import * as anthropicClient from './anthropic';
import * as deepseekClient from './deepseek';

export type LLMClient = {
  streamChatResponse: (messages: Message[], userMessage: string) => AsyncGenerator<string>;
};

export function getLLMClient(): LLMClient {
  const environment = process.env.ENVIRONMENT || 'production';

  // Use DeepSeek in development if API key is available
  if (environment === 'development' && process.env.DEEPSEEK_API_KEY) {
    console.log('[LLM Factory] Using DeepSeek client (development mode)');
    return deepseekClient;
  }

  // Default to Claude (Anthropic) for production
  console.log('[LLM Factory] Using Claude client (production mode)');
  return anthropicClient;
}
