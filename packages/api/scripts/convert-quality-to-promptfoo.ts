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
import {
  ALL_PROVIDERS,
  parseProviderArgs,
  estimateCost,
  printProviderSummary,
  formatProvidersForConfig,
  type Provider,
} from './shared/providers.js';

// =============================================================================
// QUALITY TEST CONVERSION
// =============================================================================

/**
 * Convert a quality test to Promptfoo format with assertions
 */
function convertQualityTestToPromptfoo(test: QualityTest): object {
  const assertions: object[] = [];

  // 1. Check for good photography spots (at least 2 should be mentioned)
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
  const avgTokensPerTest = 1500;
  const cost = estimateCost(providers, tests.length, avgTokensPerTest);

  console.log('📊 Quality Test Summary:');
  console.log(`   Total tests: ${tests.length}`);
  console.log(`   Locations: ${QUALITY_TESTS.map((t) => t.location).join(', ')}`);
  console.log(`   Models: ${providers.length}`);
  console.log(`   Total API calls: ${tests.length * providers.length}`);
  console.log(`   Estimated cost: ~$${cost.toFixed(3)}\n`);

  printProviderSummary(providers);

  return {
    description: 'PhotoScout Photography Quality Testing - Evaluates spot recommendations quality',
    providers: formatProvidersForConfig(providers),
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

const providers = parseProviderArgs(ALL_PROVIDERS);
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
