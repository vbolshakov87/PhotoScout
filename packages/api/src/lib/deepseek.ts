import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './prompts';
import type { Message } from '@photoscout/shared';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function* streamChatResponse(
  messages: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const formattedMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  formattedMessages.push({
    role: 'user',
    content: userMessage,
  });

  const stream = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...formattedMessages],
    stream: true,
    max_tokens: 8192, // DeepSeek API limit (same as Claude Sonnet 4)
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const choice = chunk.choices[0];

    // Log finish reason if stream is ending
    if (choice?.finish_reason) {
      console.log('[DeepSeek] Stream finished:', {
        finish_reason: choice.finish_reason,
      });
    }

    const content = choice?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
