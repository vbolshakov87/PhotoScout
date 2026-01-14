import type { ModelConfig } from './types.js';

export const MODELS: ModelConfig[] = [
  // === ULTRA-BUDGET TIER ($0.15-0.50/1M input) ===
  {
    id: 'gpt4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiModel: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    tier: 'ultra-budget',
    notes: 'Best value, good instruction following',
    enabled: true 
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V3.2',
    provider: 'deepseek',
    apiModel: 'deepseek-chat',
    inputCostPer1M: 0.28,
    outputCostPer1M: 0.42,
    tier: 'ultra-budget',
    notes: 'Cheapest, 60 RPM limit, may add JSON preamble',
    enabled: true,
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    apiModel: 'gemini-3-flash-preview',
    inputCostPer1M: 0.50,
    outputCostPer1M: 3.00,
    tier: 'ultra-budget',
    notes: 'Fastest, 1M context, 2000 RPM',
    enabled: true,
  },

  // === BUDGET TIER ($0.80-1.00/1M input) ===
  {
    id: 'haiku-3-5',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    apiModel: 'claude-3-5-haiku-20241022',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    tier: 'budget',
    notes: '20% cheaper than 4.5, older model',
    enabled: false, // Replaced by Haiku 4.5
  },
  {
    id: 'haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    inputCostPer1M: 1.00,
    outputCostPer1M: 5.00,
    tier: 'budget',
    notes: 'Most reliable structured output',
    enabled: true,
  },
  // === QUALITY TIER ($1.75-3.00/1M input) ===
  {
    id: 'gpt5-2',
    name: 'GPT-5.2',
    provider: 'openai',
    apiModel: 'gpt-5.2',
    inputCostPer1M: 1.75,
    outputCostPer1M: 14.00,
    tier: 'quality',
    notes: 'Latest OpenAI flagship, 400K context',
    enabled: false, // Expensive, no significant quality gain over budget models
  },
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-5-20250929',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    tier: 'quality',
    notes: 'Best reasoning, quality reference',
  },
];
