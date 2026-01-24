/**
 * Shared provider configurations for Promptfoo test scripts
 *
 * Used by both security and quality test converters.
 */

export interface Provider {
  id: string;
  label: string;
  tier: 'ultra-budget' | 'budget' | 'quality' | 'premium';
  costPer1MInput: number;
  config: { max_tokens: number; temperature: number };
  delay?: number; // ms between requests for rate limiting
}

/**
 * Production model (Claude Haiku 4.5)
 * Note: Anthropic models need "messages:" prefix for Promptfoo
 * Delay: 2500ms between requests to stay under 30k tokens/min
 */
export const PROD_MODEL: Provider = {
  id: 'anthropic:messages:claude-haiku-4-5-20251001',
  label: 'Claude Haiku 4.5 (PROD)',
  tier: 'budget',
  costPer1MInput: 0.8,
  config: { max_tokens: 2000, temperature: 0.7 },
  delay: 2500, // Anthropic rate limit: 30k tokens/min
};

/**
 * All available models for testing (5 total)
 */
export const ALL_PROVIDERS: Provider[] = [
  // Ultra-budget tier ($0.10-0.15/1M input)
  {
    id: 'openai:gpt-4o-mini',
    label: 'GPT-4o Mini',
    tier: 'ultra-budget',
    costPer1MInput: 0.15,
    config: { max_tokens: 2000, temperature: 0.7 },
  },
  {
    id: 'deepseek:deepseek-chat',
    label: 'DeepSeek V3.2',
    tier: 'ultra-budget',
    costPer1MInput: 0.14,
    config: { max_tokens: 2000, temperature: 0.7 },
  },
  {
    id: 'google:gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    tier: 'ultra-budget',
    costPer1MInput: 0.1,
    config: { max_tokens: 2000, temperature: 0.7 },
  },
  // Budget tier ($0.80/1M input) - PROD_MODEL
  PROD_MODEL,
  // Quality tier ($2.00/1M input)
  {
    id: 'mistral:mistral-large-latest',
    label: 'Mistral Large 3',
    tier: 'quality',
    costPer1MInput: 2.0,
    config: { max_tokens: 2000, temperature: 0.7 },
  },
];

/**
 * Parse CLI arguments to select providers
 *
 * @param defaultProviders - Providers to use when no args specified
 * @returns Selected providers based on CLI args
 */
export function parseProviderArgs(defaultProviders: Provider[] = ALL_PROVIDERS): Provider[] {
  const args = process.argv.slice(2);

  // --prod: Production model only
  if (args.includes('--prod')) {
    console.log('📍 Mode: Production model only (Claude Haiku 4.5)\n');
    return [PROD_MODEL];
  }

  // --all: All 5 models
  if (args.includes('--all')) {
    console.log(`📍 Mode: All ${ALL_PROVIDERS.length} models\n`);
    return ALL_PROVIDERS;
  }

  // --model <id>: Specific model
  const modelIndex = args.indexOf('--model');
  if (modelIndex !== -1 && args[modelIndex + 1]) {
    const modelId = args[modelIndex + 1];
    const model = ALL_PROVIDERS.find((p) => p.id === modelId);
    if (model) {
      console.log(`📍 Mode: Single model (${model.label})\n`);
      return [model];
    } else {
      console.error(`❌ Unknown model: ${modelId}`);
      console.error('Available models:');
      ALL_PROVIDERS.forEach((p) => console.error(`   ${p.id}`));
      process.exit(1);
    }
  }

  // Default
  console.log(`📍 Mode: Default (${defaultProviders.length} models)\n`);
  return defaultProviders;
}

/**
 * Estimate API cost for a test run
 */
export function estimateCost(
  providers: Provider[],
  testCount: number,
  avgTokensPerTest: number
): number {
  return providers.reduce((sum, p) => {
    return sum + (testCount * avgTokensPerTest * p.costPer1MInput) / 1_000_000;
  }, 0);
}

/**
 * Print provider summary to console
 */
export function printProviderSummary(providers: Provider[]): void {
  console.log('🤖 Models:');
  providers.forEach((p) => {
    console.log(`   • ${p.label} (${p.tier}, $${p.costPer1MInput}/1M)`);
  });
  console.log('');
}

/**
 * Format providers for Promptfoo config
 */
export function formatProvidersForConfig(
  providers: Provider[],
  maxTokensOverride?: number
): object[] {
  return providers.map((p) => ({
    id: p.id,
    label: p.label,
    config: maxTokensOverride ? { ...p.config, max_tokens: maxTokensOverride } : p.config,
    ...(p.delay && { delay: p.delay }),
  }));
}
