import type { ModelConfig } from './types.js';

// Model configurations - sorted by cost (cheapest first)
export const MODELS: ModelConfig[] = [
  // Ultra-budget tier ($0.10-0.30/1M input)
  {
    id: 'gpt4o-mini',
    name: 'GPT-4o-mini',
    provider: 'openai',
    apiModel: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    apiModel: 'deepseek-chat',
    inputCostPer1M: 0.27,
    outputCostPer1M: 1.10,
  },
  {
    id: 'gemini-2-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    apiModel: 'gemini-2.0-flash',
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    apiModel: 'gemini-2.5-flash-preview-04-17',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  // Budget tier ($1.00/1M input)
  {
    id: 'haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    inputCostPer1M: 1.00,
    outputCostPer1M: 5.00,
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'openai',
    apiModel: 'gpt-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
  },
  // Quality tier ($3.00/1M input)
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-20250514',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
];
