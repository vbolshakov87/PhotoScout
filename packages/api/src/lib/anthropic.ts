import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts';
import type { Message } from '@photoscout/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model selection based on environment variable
// CLAUDE_MODEL=haiku (cheap, fast) | sonnet (balanced) | opus (best quality)
type ClaudeModel = 'haiku' | 'sonnet' | 'opus';

const MODEL_IDS: Record<ClaudeModel, string> = {
  haiku: 'claude-3-5-haiku-20241022',     // $0.80/1M input, $4/1M output - fast & cheap
  sonnet: 'claude-sonnet-4-20250514',     // $3/1M input - balanced
  opus: 'claude-opus-4-20250514',         // $15/1M input - best quality
};

function getModel(): string {
  const modelEnv = (process.env.CLAUDE_MODEL || 'sonnet').toLowerCase() as ClaudeModel;
  const model = MODEL_IDS[modelEnv] || MODEL_IDS.sonnet;
  console.log(`[Anthropic] Using model: ${model}`);
  return model;
}

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

  const stream = await anthropic.messages.stream({
    model: getModel(),
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: formattedMessages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
