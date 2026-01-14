import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ModelConfig, Message, LLMResponse } from '../types.js';
import { SYSTEM_PROMPT } from './prompt.js';

// Provider clients (lazy initialized)
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let deepseekClient: OpenAI | null = null;
let googleClient: GoogleGenerativeAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getDeepSeekClient(): OpenAI {
  if (!deepseekClient) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not set');
    }
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }
  return deepseekClient;
}

function getGoogleClient(): GoogleGenerativeAI {
  if (!googleClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }
    googleClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return googleClient;
}

export async function queryModel(
  model: ModelConfig,
  messages: Message[],
  customSystemPrompt?: string
): Promise<LLMResponse> {
  const start = Date.now();
  const systemPrompt = customSystemPrompt ?? SYSTEM_PROMPT;

  switch (model.provider) {
    case 'anthropic':
      return queryAnthropic(model, messages, start, systemPrompt);
    case 'openai':
      return queryOpenAI(model, messages, start, systemPrompt);
    case 'deepseek':
      return queryDeepSeek(model, messages, start, systemPrompt);
    case 'google':
      return queryGoogle(model, messages, start, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

async function queryAnthropic(
  model: ModelConfig,
  messages: Message[],
  start: number,
  systemPrompt: string
): Promise<LLMResponse> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: model.apiModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    content,
    model: model.name,
    latencyMs: Date.now() - start,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  };
}

async function queryOpenAI(
  model: ModelConfig,
  messages: Message[],
  start: number,
  systemPrompt: string
): Promise<LLMResponse> {
  const client = getOpenAIClient();

  // GPT-5.x models require max_completion_tokens instead of max_tokens
  const isGpt5 = model.apiModel.startsWith('gpt-5');

  const response = await client.chat.completions.create({
    model: model.apiModel,
    ...(isGpt5 ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
  });

  const content = response.choices[0]?.message?.content || '';

  return {
    content,
    model: model.name,
    latencyMs: Date.now() - start,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };
}

async function queryDeepSeek(
  model: ModelConfig,
  messages: Message[],
  start: number,
  systemPrompt: string
): Promise<LLMResponse> {
  const client = getDeepSeekClient();

  const response = await client.chat.completions.create({
    model: model.apiModel,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
  });

  const content = response.choices[0]?.message?.content || '';

  return {
    content,
    model: model.name,
    latencyMs: Date.now() - start,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };
}

async function queryGoogle(
  model: ModelConfig,
  messages: Message[],
  start: number,
  systemPrompt: string
): Promise<LLMResponse> {
  const client = getGoogleClient();
  const genModel = client.getGenerativeModel({
    model: model.apiModel,
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;
  const content = response.text();

  return {
    content,
    model: model.name,
    latencyMs: Date.now() - start,
    inputTokens: response.usageMetadata?.promptTokenCount,
    outputTokens: response.usageMetadata?.candidatesTokenCount,
  };
}

export function isModelAvailable(model: ModelConfig): boolean {
  switch (model.provider) {
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'deepseek':
      return !!process.env.DEEPSEEK_API_KEY;
    case 'google':
      return !!process.env.GEMINI_API_KEY;
    default:
      return false;
  }
}
