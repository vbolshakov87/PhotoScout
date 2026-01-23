/**
 * Converts quality-tests.ts to Promptfoo YAML format
 *
 * Usage:
 *   pnpm quality:convert              # All 5 models (default)
 *   pnpm quality:convert -- --prod    # Production model only (Claude Haiku 4.5)
 *   pnpm quality:convert -- --all     # All 5 models
 *   pnpm quality:convert -- --model anthropic:messages:claude-haiku-4-5-20251001
 *
 * Quality tests evaluate:
 * - Good photography spots (real locations, not generic advice)
 * - Timing recommendations (sunrise, sunset, golden hour)
 * - Coordinate accuracy
 * - Date awareness
 */

import * as fs from 'node:fs';
import * as yaml from 'yaml';
import {
  QUALITY_TESTS,
  PHOTOGRAPHY_KEYWORDS,
  TIMING_KEYWORDS,
  type QualityTest,
} from '../src/tests/quality/quality-tests.js';
import { SYSTEM_PROMPT } from '../src/lib/prompts.js';

// =============================================================================
// MODEL CONFIGURATIONS
// =============================================================================

interface Provider {
  id: string;
  label: string;
  tier: 'ultra-budget' | 'budget' | 'quality' | 'premium';
  costPer1MInput: number;
  config: { max_tokens: number; temperature: number };
  delay?: number; // ms between requests for rate limiting
}

// Production model
const PROD_MODEL: Provider = {
  id: 'anthropic:messages:claude-haiku-4-5-20251001',
  label: 'Claude Haiku 4.5 (PROD)',
  tier: 'budget',
  costPer1MInput: 0.8,
  config: { max_tokens: 2000, temperature: 0.7 },
  delay: 2500, // Anthropic rate limit: 30k tokens/min
};

// All available models for quality testing
const ALL_PROVIDERS: Provider[] = [
  // Ultra-budget tier
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
  // Budget tier - PROD_MODEL
  PROD_MODEL,
  // Quality tier
  {
    id: 'mistral:mistral-large-latest',
    label: 'Mistral Large 3',
    tier: 'quality',
    costPer1MInput: 2.0,
    config: { max_tokens: 2000, temperature: 0.7 },
  },
];

const DEFAULT_PROVIDERS = ALL_PROVIDERS;

// =============================================================================
// PARSE CLI ARGUMENTS
// =============================================================================

function parseArgs(): Provider[] {
  const args = process.argv.slice(2);

  if (args.includes('--prod')) {
    console.log('📍 Mode: Production model only (Claude Haiku 4.5)\n');
    return [PROD_MODEL];
  }

  if (args.includes('--all')) {
    console.log('📍 Mode: All 5 models\n');
    return ALL_PROVIDERS;
  }

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

  console.log('📍 Mode: Default (5 models)\n');
  return DEFAULT_PROVIDERS;
}

// =============================================================================
// QUALITY TEST CONVERSION
// =============================================================================

/**
 * Convert a quality test to Promptfoo format with assertions
 */
function convertQualityTestToPromptfoo(test: QualityTest): object {
  const assertions: object[] = [];

  // 1. Check for good photography spots (at least 2 should be mentioned)
  // Using JavaScript assertion to count matches
  const goodSpotsPattern = test.goodSpots
    .map((s) => s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  assertions.push({
    type: 'javascript',
    value: `
      const spots = output.toLowerCase();
      const pattern = /${goodSpotsPattern}/gi;
      const matches = spots.match(pattern) || [];
      const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
      return uniqueMatches.length >= 2;
    `.trim(),
    metric: 'GoodSpotsCount',
  });

  // 2. Check for red flags (generic tourist advice) - should NOT be present
  test.redFlags.slice(0, 5).forEach((redFlag) => {
    assertions.push({
      type: 'not-icontains',
      value: redFlag,
    });
  });

  // 3. Check for timing keywords (sunrise, sunset, golden hour)
  const timingPattern = TIMING_KEYWORDS.join('|');
  assertions.push({
    type: 'javascript',
    value: `output.toLowerCase().match(/(${timingPattern})/gi) !== null`,
    metric: 'HasTimingAdvice',
  });

  // 4. Check for coordinates (decimal degrees pattern)
  assertions.push({
    type: 'javascript',
    value: `
      const hasDecimalCoords = /\\d{1,3}\\.\\d{3,}/.test(output);
      const hasLatLng = /lat|lng|latitude|longitude/i.test(output);
      return hasDecimalCoords || hasLatLng;
    `.trim(),
    metric: 'HasCoordinates',
  });

  // 5. Check that response mentions the expected date/season
  assertions.push({
    type: 'icontains',
    value: test.expectedDate,
    metric: 'DateAwareness',
  });

  // 6. Check for photography-specific keywords (not just generic travel)
  const photoPattern = PHOTOGRAPHY_KEYWORDS.slice(0, 8).join('|');
  assertions.push({
    type: 'javascript',
    value: `output.toLowerCase().match(/(${photoPattern})/gi)?.length >= 3`,
    metric: 'PhotographyFocus',
  });

  // 7. Response should be substantial (real advice, not refusal)
  assertions.push({
    type: 'javascript',
    value: 'output.length > 500',
    metric: 'SubstantialResponse',
  });

  return {
    description: `[${test.id.toUpperCase()}] ${test.name}: ${test.location}`,
    vars: {
      query: test.prompt,
    },
    assert: assertions,
    metadata: {
      id: test.id,
      location: test.location,
      expectedDate: test.expectedDate,
      goodSpotsCount: test.goodSpots.length,
    },
  };
}

/**
 * Generate the complete Promptfoo config
 */
function generateConfig(providers: Provider[]): object {
  const tests = QUALITY_TESTS.map(convertQualityTestToPromptfoo);

  // Estimate cost (quality tests use more tokens due to detailed responses)
  const avgTokensPerTest = 1500; // Quality responses are longer
  const estimatedCost = providers.reduce((sum, p) => {
    return sum + (tests.length * avgTokensPerTest * p.costPer1MInput) / 1_000_000;
  }, 0);

  console.log('📊 Quality Test Summary:');
  console.log(`   Total tests: ${tests.length}`);
  console.log(`   Locations: ${QUALITY_TESTS.map((t) => t.location).join(', ')}`);
  console.log(`   Models: ${providers.length}`);
  console.log(`   Total API calls: ${tests.length * providers.length}`);
  console.log(`   Estimated cost: ~$${estimatedCost.toFixed(3)}\n`);

  console.log('🤖 Models:');
  providers.forEach((p) => {
    console.log(`   • ${p.label} (${p.tier}, $${p.costPer1MInput}/1M)`);
  });
  console.log('');

  return {
    description: 'PhotoScout Photography Quality Testing - Evaluates spot recommendations quality',
    providers: providers.map((p) => ({
      id: p.id,
      label: p.label,
      config: p.config,
      ...(p.delay && { delay: p.delay }),
    })),
    prompts: [
      {
        id: 'photoscout-quality',
        label: 'PhotoScout Quality Test Prompt',
        raw: `${SYSTEM_PROMPT}

User: {{query}}`,
      },
    ],
    defaultTest: {
      options: {
        transformVars: '{ ...vars }',
      },
    },
    tests,
  };
}

// =============================================================================
// MAIN
// =============================================================================

console.log('🔄 Converting quality-tests.ts to Promptfoo format...\n');

const providers = parseArgs();
const config = generateConfig(providers);
const yamlContent = yaml.stringify(config, { lineWidth: 0 });

// Write config to separate file for quality tests
const configPath = new URL('../promptfoo-quality.yaml', import.meta.url).pathname;
fs.writeFileSync(configPath, yamlContent);
console.log(`✅ Created: ${configPath}`);

// Write a summary file
const summary = `# Quality Test Summary

Generated: ${new Date().toISOString()}

## Overview

Quality tests evaluate PhotoScout's photography knowledge quality:
- **Good Spots**: Real photography locations vs generic tourist attractions
- **Timing**: Sunrise, sunset, golden hour recommendations
- **Coordinates**: Accurate lat/lng for each spot
- **Date Awareness**: Response reflects the specified travel dates

## Test Locations

| Location | ID | Good Spots | Expected Date |
|----------|-----|------------|---------------|
${QUALITY_TESTS.map((t) => `| ${t.location} | ${t.id} | ${t.goodSpots.length} | ${t.expectedDate} |`).join('\n')}

## Models (${providers.length})

| Model | Provider | Tier | Cost (per 1M input) |
|-------|----------|------|---------------------|
${providers.map((p) => `| ${p.label} | ${p.id.split(':')[0]} | ${p.tier} | $${p.costPer1MInput.toFixed(2)} |`).join('\n')}

## Assertions

Each test checks for:
1. **GoodSpotsCount** - At least 2 real photography spots mentioned
2. **NoRedFlags** - No generic tourist advice (e.g., "beautiful scenery")
3. **HasTimingAdvice** - Includes sunrise/sunset/golden hour recommendations
4. **HasCoordinates** - Provides GPS coordinates (decimal degrees)
5. **DateAwareness** - Response mentions the specified travel month
6. **PhotographyFocus** - Uses photography terminology (not just travel)
7. **SubstantialResponse** - Response length > 500 chars (real advice)

## Commands

\`\`\`bash
# Generate config for different model sets
pnpm quality:convert              # All 5 models (default)
pnpm quality:convert -- --prod    # Production only (Claude Haiku 4.5)
pnpm quality:convert -- --all     # All 5 models

# Run tests
pnpm quality:eval                 # Full suite
pnpm quality:eval:fast            # Higher concurrency

# Reports
pnpm quality:report               # Generate HTML report
pnpm quality:view                 # Interactive browser view
\`\`\`

## Scoring Guide

| Score | Description |
|-------|-------------|
| 0 | Generic tourist advice, no photo-specific spots |
| 1 | Mentions 1-2 obvious spots without photo context |
| 2 | Good spots but wrong timing/generic descriptions |
| 3 | Good spots + correct golden hour timing |
| 4 | Great spots + timing + composition tips |
| 5 | Hidden gems + specific viewpoints + photographer insights |
`;

const summaryPath = new URL('../QUALITY_TESTS.md', import.meta.url).pathname;
fs.writeFileSync(summaryPath, summary);
console.log(`✅ Created: ${summaryPath}`);

console.log('\n🚀 Next steps:');
console.log('   1. Set up API keys in .env or .env.local');
console.log('   2. Run: pnpm quality:eval');
console.log('   3. View: pnpm quality:view\n');
