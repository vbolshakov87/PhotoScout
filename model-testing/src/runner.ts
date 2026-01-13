#!/usr/bin/env tsx
/**
 * PhotoScout Model Testing Runner
 *
 * Run all tests: npm test
 * Run specific model: npm test -- --model deepseek
 * Run specific test: npm test -- --case json-compliance
 * Run all models: npm test -- --all
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (parent directory)
config({ path: resolve(import.meta.dirname, '../../.env') });

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { queryModel, isModelAvailable } from './providers/index.js';
import { TEST_CASES, getTestById } from './tests/cases.js';
import type {
  ModelConfig,
  TestCase,
  ModelTestResult,
  TestSuiteResult,
  ModelSummary,
  Message,
  LLMResponse,
} from './types.js';
import { MODELS } from './config.js';

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(msg: string) {
  console.log(msg);
}

function logSuccess(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logFailure(msg: string) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function logInfo(msg: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function logHeader(msg: string) {
  console.log(`\n${colors.bold}${msg}${colors.reset}`);
}

// Parse CLI arguments
function parseArgs(): { models: string[]; tests: string[]; verbose: boolean } {
  const args = process.argv.slice(2);
  let models: string[] = [];
  let tests: string[] = [];
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--model' || arg === '-m') {
      const modelId = args[++i];
      if (modelId) models.push(modelId);
    } else if (arg === '--case' || arg === '-c') {
      const testId = args[++i];
      if (testId) tests.push(testId);
    } else if (arg === '--all' || arg === '-a') {
      models = MODELS.map(m => m.id);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Default: run all available models if none specified
  if (models.length === 0) {
    models = MODELS.filter(m => isModelAvailable(m)).map(m => m.id);
  }

  // Default: run all tests if none specified
  if (tests.length === 0) {
    tests = TEST_CASES.map(t => t.id);
  }

  return { models, tests, verbose };
}

function printHelp() {
  console.log(`
PhotoScout Model Testing

Usage:
  npm test                    Run all tests on available models
  npm test -- --all           Run all tests on ALL models (even without API keys)
  npm test -- --model deepseek Run tests on specific model
  npm test -- --case json-compliance Run specific test
  npm test -- -v              Verbose output

Models:
  ${MODELS.map(m => `${m.id.padEnd(15)} ${m.name}`).join('\n  ')}

Tests:
  ${TEST_CASES.map(t => `${t.id.padEnd(20)} ${t.name}`).join('\n  ')}

Environment Variables:
  ANTHROPIC_API_KEY    For Claude models
  OPENAI_API_KEY       For GPT-4o-mini
  DEEPSEEK_API_KEY     For DeepSeek
  GEMINI_API_KEY       For Gemini
`);
}

// Run a single test case
async function runTest(
  model: ModelConfig,
  test: TestCase,
  verbose: boolean
): Promise<ModelTestResult> {
  const responses: LLMResponse[] = [];
  const allResponseTexts: string[] = [];

  try {
    // Handle multi-turn tests
    if (test.id === 'multi-turn') {
      // Multi-turn conversation: send messages one at a time, collect responses
      const conversationHistory: Message[] = [];

      for (const msg of test.messages) {
        if (msg.role === 'user') {
          conversationHistory.push(msg);
          const response = await queryModel(model, conversationHistory);
          responses.push(response);
          allResponseTexts.push(response.content);
          conversationHistory.push({ role: 'assistant', content: response.content });
        }
        // Skip assistant placeholders - they get replaced by actual responses
      }
    } else {
      // Single or simple multi-turn: send all messages at once
      const response = await queryModel(model, test.messages);
      responses.push(response);
      allResponseTexts.push(response.content);
    }

    // Evaluate
    const result = test.evaluate(responses);
    const totalLatency = responses.reduce((sum, r) => sum + r.latencyMs, 0);

    if (verbose) {
      log(`\n${colors.dim}Response preview:${colors.reset}`);
      log(colors.dim + allResponseTexts[allResponseTexts.length - 1].substring(0, 200) + '...' + colors.reset);
    }

    return {
      modelId: model.id,
      modelName: model.name,
      testId: test.id,
      testName: test.name,
      passed: result.passed,
      score: result.score,
      checks: result.checks,
      latencyMs: totalLatency,
      responses: allResponseTexts,
      notes: result.notes,
    };
  } catch (error) {
    return {
      modelId: model.id,
      modelName: model.name,
      testId: test.id,
      testName: test.name,
      passed: false,
      score: 0,
      checks: [],
      latencyMs: 0,
      responses: [],
      error: (error as Error).message,
    };
  }
}

// Run all tests for a model
async function runModelTests(
  model: ModelConfig,
  tests: TestCase[],
  verbose: boolean
): Promise<ModelTestResult[]> {
  const results: ModelTestResult[] = [];

  logHeader(`Testing ${model.name}`);

  if (!isModelAvailable(model)) {
    logInfo(`Skipping - API key not set for ${model.provider}`);
    return results;
  }

  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);

    const result = await runTest(model, test, verbose);
    results.push(result);

    if (result.error) {
      logFailure(`ERROR: ${result.error}`);
    } else if (result.passed) {
      logSuccess(`${(result.score * 100).toFixed(0)}% (${result.latencyMs}ms)`);
    } else {
      logFailure(`${(result.score * 100).toFixed(0)}% (${result.latencyMs}ms)`);
      // Show failed checks
      for (const check of result.checks) {
        if (!check.passed) {
          log(`    ${colors.red}✗${colors.reset} ${check.name}${check.details ? ` - ${check.details}` : ''}`);
        }
      }
    }
  }

  return results;
}

// Calculate model summary
function calculateSummary(
  model: ModelConfig,
  results: ModelTestResult[]
): ModelSummary {
  const modelResults = results.filter(r => r.modelId === model.id);
  const passed = modelResults.filter(r => r.passed).length;
  const avgLatency =
    modelResults.length > 0
      ? modelResults.reduce((sum, r) => sum + r.latencyMs, 0) / modelResults.length
      : 0;

  // Estimate cost per conversation (assume ~2000 input, ~1000 output tokens)
  const estimatedCost =
    (2000 / 1_000_000) * model.inputCostPer1M +
    (1000 / 1_000_000) * model.outputCostPer1M;

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    totalTests: modelResults.length,
    passed,
    failed: modelResults.length - passed,
    score: modelResults.length > 0 ? (passed / modelResults.length) * 100 : 0,
    avgLatency: Math.round(avgLatency),
    estimatedCostPerConv: estimatedCost,
  };
}

// Print summary table
function printSummary(summaries: ModelSummary[]) {
  logHeader('Results Summary');

  // Header
  console.log(
    '┌────────────────────┬───────┬────────┬─────────┬──────────────┐'
  );
  console.log(
    '│ Model              │ Score │ Passed │ Latency │ Cost/Conv    │'
  );
  console.log(
    '├────────────────────┼───────┼────────┼─────────┼──────────────┤'
  );

  // Sort by score descending
  const sorted = [...summaries].sort((a, b) => b.score - a.score);

  for (const s of sorted) {
    const scoreColor = s.score >= 90 ? colors.green : s.score >= 70 ? colors.yellow : colors.red;
    const name = s.name.padEnd(18);
    const score = `${scoreColor}${s.score.toFixed(0)}%${colors.reset}`.padEnd(14);
    const passed = `${s.passed}/${s.totalTests}`.padEnd(6);
    const latency = `${s.avgLatency}ms`.padEnd(7);
    const cost = `$${s.estimatedCostPerConv.toFixed(4)}`.padEnd(12);

    console.log(`│ ${name} │ ${score} │ ${passed} │ ${latency} │ ${cost} │`);
  }

  console.log(
    '└────────────────────┴───────┴────────┴─────────┴──────────────┘'
  );

  // Recommendation
  const best = sorted.find(s => s.score >= 90);
  if (best) {
    logInfo(`Recommendation: ${colors.bold}${best.name}${colors.reset} - ${best.score.toFixed(0)}% pass rate at $${best.estimatedCostPerConv.toFixed(4)}/conv`);
  } else {
    logInfo('No model achieved >= 90% pass rate. Consider simplifying the prompt.');
  }
}

// Save results
function saveResults(result: TestSuiteResult) {
  const resultsDir = new URL('../results', import.meta.url).pathname;

  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  // Save JSON results
  const jsonPath = `${resultsDir}/results.json`;
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  logInfo(`Results saved to ${jsonPath}`);

  // Save latest timestamp
  const latestPath = `${resultsDir}/latest.txt`;
  writeFileSync(latestPath, result.timestamp);
}

// Main
async function main() {
  const { models, tests, verbose } = parseArgs();

  log(`\n${colors.bold}PhotoScout Model Testing${colors.reset}`);
  log(`${colors.dim}Testing ${models.length} model(s) with ${tests.length} test(s)${colors.reset}\n`);

  // Check available API keys
  const availableModels = MODELS.filter(m => models.includes(m.id));
  const unavailable = availableModels.filter(m => !isModelAvailable(m));

  if (unavailable.length > 0) {
    logInfo(`Missing API keys for: ${unavailable.map(m => m.name).join(', ')}`);
  }

  const startTime = Date.now();
  const allResults: ModelTestResult[] = [];

  // Get test cases
  const testCases = tests.map(id => getTestById(id)).filter((t): t is TestCase => t !== undefined);

  // Run tests for each model
  for (const modelId of models) {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) {
      logInfo(`Unknown model: ${modelId}`);
      continue;
    }

    const results = await runModelTests(model, testCases, verbose);
    allResults.push(...results);
  }

  // Calculate summaries
  const summaries = models
    .map(id => MODELS.find(m => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined)
    .filter(m => isModelAvailable(m))
    .map(m => calculateSummary(m, allResults));

  // Print and save results
  printSummary(summaries);

  const result: TestSuiteResult = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    models: summaries,
    results: allResults,
  };

  saveResults(result);

  // Exit code based on results
  const failedTests = allResults.filter(r => !r.passed).length;
  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch(console.error);
