import Anthropic from '@anthropic-ai/sdk';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SYSTEM_PROMPT } from './prompts';
import type { Message } from '@photoscout/shared';

const ssmClient = new SSMClient({});
let apiKeyCache: string | null = null;

async function getApiKey(): Promise<string> {
  if (apiKeyCache) {
    return apiKeyCache;
  }

  const parameterName = process.env.ANTHROPIC_API_KEY_PARAMETER;
  if (!parameterName) {
    throw new Error('ANTHROPIC_API_KEY_PARAMETER environment variable not set');
  }

  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  });

  const response = await ssmClient.send(command);
  if (!response.Parameter?.Value) {
    throw new Error('Failed to retrieve API key from SSM');
  }

  apiKeyCache = response.Parameter.Value;
  return apiKeyCache;
}

export async function* streamChatResponse(
  messages: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const apiKey = await getApiKey();
  const anthropic = new Anthropic({ apiKey });
  const formattedMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  formattedMessages.push({
    role: 'user',
    content: userMessage,
  });

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
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
