#!/usr/bin/env tsx
/**
 * PhotoScout Quality Test Runner
 *
 * Tests photography spot quality across models.
 *
 * Usage:
 *   npm run quality              Run all quality tests
 *   npm run quality -- --model haiku  Run for specific model
 *   npm run quality -- --location lofoten  Run specific location
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(import.meta.dirname, '../../.env') });

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { queryModel, isModelAvailable } from './providers/index.js';
import {
  QUALITY_TESTS,
  QUALITY_TEST_SYSTEM_PROMPT,
  scoreQualityResponse,
  getScoreNotes,
  type QualityTest,
  type QualityTestResult,
  type QualityReport,
  type QualityModelSummary,
} from './tests/quality.js';
import { MODELS } from './config.js';
import type { ModelConfig } from './types.js';

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

function logHeader(msg: string) {
  console.log(`\n${colors.bold}${msg}${colors.reset}`);
}

// Parse CLI arguments
function parseArgs(): { models: string[]; locations: string[]; runs: number; parallel: boolean } {
  const args = process.argv.slice(2);
  let models: string[] = [];
  let locations: string[] = [];
  let runs = 1;
  let parallel = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--model' || arg === '-m') {
      const modelId = args[++i];
      if (modelId) models.push(modelId);
    } else if (arg === '--location' || arg === '-l') {
      const locId = args[++i];
      if (locId) locations.push(locId);
    } else if (arg === '--runs' || arg === '-r') {
      runs = parseInt(args[++i], 10) || 1;
    } else if (arg === '--parallel' || arg === '-p') {
      parallel = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Default: all enabled and available models
  if (models.length === 0) {
    models = MODELS.filter((m) => m.enabled !== false && isModelAvailable(m)).map((m) => m.id);
  }

  // Default: all locations
  if (locations.length === 0) {
    locations = QUALITY_TESTS.map((t) => t.id);
  }

  return { models, locations, runs, parallel };
}

function printHelp() {
  console.log(`
PhotoScout Quality Test Runner

Tests photography spot quality - do models recommend real spots or tourist traps?

Usage:
  npm run quality                      Run all quality tests (1 run)
  npm run quality -- --model haiku     Run for specific model
  npm run quality -- -l lofoten        Run specific location
  npm run quality -- --runs 2          Run tests twice for more reliable results
  npm run quality -- --parallel        Run tests in parallel (faster)
  npm run quality -- -r 2 -p           2 runs in parallel (recommended)

Options:
  -m, --model <id>      Test specific model
  -l, --location <id>   Test specific location
  -r, --runs <n>        Number of runs per test (default: 1)
  -p, --parallel        Run models in parallel

Locations:
  ${QUALITY_TESTS.map((t) => `${t.id.padEnd(12)} ${t.location}`).join('\n  ')}

Models:
  ${MODELS.map((m) => `${m.id.padEnd(12)} ${m.name} (${m.tier})`).join('\n  ')}

Scoring (0-5):
  0 = Generic tourist advice
  1 = 1-2 obvious spots, no photo context
  2 = Good spots, wrong timing
  3 = Good spots + golden hour timing
  4 = Great spots + timing + composition tips
  5 = Hidden gems + specific viewpoints
`);
}

// Calculate cost for a single API call
function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * model.inputCostPer1M +
    (outputTokens / 1_000_000) * model.outputCostPer1M
  );
}

// Run a single quality test
async function runQualityTest(
  model: ModelConfig,
  test: QualityTest
): Promise<QualityTestResult> {
  try {
    // Use quality-specific system prompt to get direct recommendations
    const response = await queryModel(
      model,
      [{ role: 'user', content: test.prompt }],
      QUALITY_TEST_SYSTEM_PROMPT
    );

    const score = scoreQualityResponse(response.content, test);
    const inputTokens = response.inputTokens || 0;
    const outputTokens = response.outputTokens || 0;
    const cost = calculateCost(model, inputTokens, outputTokens);

    return {
      modelId: model.id,
      modelName: model.name,
      testId: test.id,
      location: test.location,
      score,
      latencyMs: response.latencyMs,
      response: response.content,
      inputTokens,
      outputTokens,
      cost,
    };
  } catch (error) {
    return {
      modelId: model.id,
      modelName: model.name,
      testId: test.id,
      location: test.location,
      score: {
        contentScore: 0,
        maxContentScore: 5,
        formatScore: 0,
        maxFormatScore: 3,
        dateScore: 0,
        score: 0,
        maxScore: 5,
        goodSpotsFound: [],
        redFlagsFound: [],
        missingMustHave: [],
        hasValidJson: false,
        jsonStartsClean: false,
        dateReflected: false,
        reasoning: 'Error',
      },
      latencyMs: 0,
      response: '',
      error: (error as Error).message,
    };
  }
}

// Generate HTML report (similar to compliance report.html)
function generateHtmlReport(report: QualityReport): string {
  const sorted = [...report.summary].sort((a, b) => b.avgScore - a.avgScore);
  const winner = sorted[0];

  // Escape HTML in responses
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Generate summary cards
  const summaryCards = sorted
    .map((s) => {
      const model = MODELS.find((m) => m.id === s.modelId);
      const isWinner = s.modelId === winner.modelId;
      const scoreClass =
        s.avgScore >= 4 ? 'pass' : s.avgScore >= 3 ? 'warn' : 'fail';
      const avgLatency = report.results
        .filter((r) => r.modelId === s.modelId)
        .reduce((sum, r) => sum + r.latencyMs, 0) /
        report.results.filter((r) => r.modelId === s.modelId).length;

      return `
        <div class="summary-card${isWinner ? ' winner' : ''}">
          <div class="model-name">${s.modelName}${isWinner ? ' &#127942;' : ''}</div>
          <div class="model-provider">${model?.provider || ''} • ${model?.tier || ''}</div>
          <div class="score-large ${scoreClass}">${s.avgScore.toFixed(1)}/5</div>
          <div class="stats">
            <span>Format: ${s.avgFormatScore.toFixed(1)}/3</span>
            <span>Date: ${s.avgDateScore.toFixed(1)}/1</span>
          </div>
          <div class="stats">
            <span>${Math.round(avgLatency)}ms avg</span>
          </div>
          <div class="cost">$${s.totalCost.toFixed(4)} total</div>
        </div>`;
    })
    .join('');

  // Generate scoring table
  const modelHeaders = sorted.map((s) => `<th>${s.modelName}</th>`).join('');
  const tableRows = QUALITY_TESTS.map((test) => {
    const cells = sorted
      .map((s) => {
        // Get all results for this model/location (could be multiple runs)
        const locResults = report.results.filter(
          (r) => r.modelId === s.modelId && r.testId === test.id
        );
        if (locResults.length === 0) return '<td class="cell-error">N/A</td>';

        // Average across runs
        const avgScore =
          locResults.reduce((sum, r) => sum + r.score.score, 0) /
          locResults.length;
        const cellClass =
          avgScore >= 4 ? 'cell-pass' : avgScore >= 3 ? 'cell-partial' : 'cell-fail';

        return `<td class="${cellClass}">${avgScore.toFixed(1)}/5</td>`;
      })
      .join('');
    return `
            <tr>
              <td class="test-name" title="${test.name}">${test.location}</td>
              ${cells}
            </tr>`;
  }).join('');

  // Generate detailed results
  const detailedResults = report.results
    .map((r) => {
      const statusClass = r.score.score >= 4 ? 'pass' : r.score.score >= 3 ? 'warn' : 'fail';
      const runLabel = (r as QualityTestResult & { run?: number }).run
        ? ` (Run ${(r as QualityTestResult & { run?: number }).run})`
        : '';

      const spotsList = r.score.goodSpotsFound.length > 0
        ? `<li class="check-item"><span class="check-pass">&#x2713;</span> Spots: ${r.score.goodSpotsFound.slice(0, 5).join(', ')}</li>`
        : '';
      const redFlagsList = r.score.redFlagsFound.length > 0
        ? `<li class="check-item"><span class="check-fail">&#x2717;</span> Red flags: ${r.score.redFlagsFound.join(', ')}</li>`
        : '';
      const timingCheck = !r.score.missingMustHave.some((m) =>
        ['sunrise', 'sunset', 'golden hour', 'blue hour'].includes(m.toLowerCase())
      )
        ? '<li class="check-item"><span class="check-pass">&#x2713;</span> Has timing info</li>'
        : '<li class="check-item"><span class="check-fail">&#x2717;</span> Missing timing info</li>';
      const coordsCheck = r.score.missingMustHave.includes('coordinates')
        ? '<li class="check-item"><span class="check-fail">&#x2717;</span> Missing coordinates</li>'
        : '<li class="check-item"><span class="check-pass">&#x2713;</span> Has coordinates</li>';
      const dateCheck = r.score.dateReflected
        ? '<li class="check-item"><span class="check-pass">&#x2713;</span> Date reflected</li>'
        : '<li class="check-item"><span class="check-fail">&#x2717;</span> Date not reflected</li>';
      const jsonCheck = r.score.hasValidJson
        ? r.score.jsonStartsClean
          ? '<li class="check-item"><span class="check-pass">&#x2713;</span> Valid JSON (clean)</li>'
          : '<li class="check-item"><span class="check-partial">~</span> Valid JSON (with preamble)</li>'
        : '<li class="check-item"><span class="check-fail">&#x2717;</span> No valid JSON</li>';

      return `
        <div class="detail-card">
          <div class="detail-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span><strong>${r.modelName}</strong> - ${r.location}${runLabel}</span>
            <span class="check-${statusClass}">${r.score.score}/5 (${r.score.reasoning})</span>
          </div>
          <div class="detail-content">
            <p style="margin-bottom: 0.5rem; color: #8b949e;">
              Latency: ${r.latencyMs}ms |
              Cost: $${(r.cost || 0).toFixed(5)} |
              Tokens: ${r.inputTokens || 0}/${r.outputTokens || 0}
            </p>
            <ul class="check-list">
              ${spotsList}
              ${redFlagsList}
              ${timingCheck}
              ${coordsCheck}
              ${dateCheck}
              ${jsonCheck}
            </ul>
            <p style="margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600;">Response preview:</p>
            <div class="response-preview">${escapeHtml(r.response.substring(0, 1500))}${r.response.length > 1500 ? '...' : ''}</div>
          </div>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoScout Quality Test Results</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #f0f6fc;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #f0f6fc;
    }
    .subtitle {
      color: #8b949e;
      margin-bottom: 2rem;
    }

    /* Summary cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1rem;
    }
    .summary-card.winner {
      border-color: #238636;
      background: #0d1117;
    }
    .model-name {
      font-weight: 600;
      color: #f0f6fc;
      margin-bottom: 0.25rem;
    }
    .model-provider {
      color: #8b949e;
      font-size: 0.75rem;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .score-large {
      font-size: 2rem;
      font-weight: 700;
    }
    .score-large.pass { color: #3fb950; }
    .score-large.warn { color: #d29922; }
    .score-large.fail { color: #f85149; }
    .stats {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #8b949e;
    }
    .cost {
      color: #58a6ff;
      font-family: monospace;
      margin-top: 0.5rem;
    }

    /* Scoring table */
    .table-container {
      overflow-x: auto;
      margin-bottom: 2rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #21262d;
    }
    th {
      background: #161b22;
      color: #f0f6fc;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; }
    tr:hover { background: #161b22; }
    .test-name {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Score cells */
    .cell-pass {
      background: rgba(63, 185, 80, 0.15);
      color: #3fb950;
      text-align: center;
      font-weight: 600;
    }
    .cell-fail {
      background: rgba(248, 81, 73, 0.15);
      color: #f85149;
      text-align: center;
      font-weight: 600;
    }
    .cell-partial {
      background: rgba(210, 153, 34, 0.15);
      color: #d29922;
      text-align: center;
    }
    .cell-error {
      background: rgba(248, 81, 73, 0.1);
      color: #f85149;
      font-size: 0.75rem;
    }

    /* Detail section */
    .details {
      margin-top: 2rem;
    }
    .detail-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .detail-header {
      padding: 1rem;
      background: #21262d;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .detail-header:hover { background: #30363d; }
    .detail-content {
      padding: 1rem;
      display: none;
    }
    .detail-content.open { display: block; }
    .check-list {
      list-style: none;
    }
    .check-item {
      padding: 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .check-pass { color: #3fb950; }
    .check-fail { color: #f85149; }
    .check-partial { color: #d29922; }
    .check-warn { color: #d29922; }
    .response-preview {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 4px;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-family: monospace;
      font-size: 0.75rem;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Scoring legend */
    .legend {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    .legend h3 {
      color: #f0f6fc;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .legend-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    .legend-item {
      font-size: 0.8rem;
      color: #8b949e;
    }

    /* Footer */
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #21262d;
      color: #8b949e;
      font-size: 0.75rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PhotoScout Quality Test Results</h1>
    <p class="subtitle">
      Generated: ${new Date(report.timestamp).toLocaleString()} |
      Duration: ${(report.duration / 1000).toFixed(1)}s |
      ${report.summary.length} models | ${QUALITY_TESTS.length} locations |
      Total cost: $${report.totalCost.toFixed(4)}
    </p>

    <!-- Scoring Legend -->
    <div class="legend">
      <h3>Scoring Guide</h3>
      <div class="legend-grid">
        <div class="legend-item"><strong>Content (0-5):</strong> +1-3 good spots, +1 timing, +1 coords, -1 each red flag</div>
        <div class="legend-item"><strong>Format (0-3):</strong> +1 valid JSON, +1 clean start, +1 required fields</div>
        <div class="legend-item"><strong>Date (0-1):</strong> +1 if requested date reflected in response</div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      ${summaryCards}
    </div>

    <!-- Scoring Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Location</th>
            ${modelHeaders}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <!-- Detailed Results -->
    <div class="details">
      <h2>Detailed Results</h2>
      ${detailedResults}
    </div>

    <div class="footer">
      PhotoScout Model Testing | Quality Tests
    </div>
  </div>
</body>
</html>`;
}

// Generate markdown report
function generateMarkdownReport(report: QualityReport): string {
  const lines: string[] = [];

  lines.push('# Photography Quality Test Results\n');
  lines.push(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  lines.push(`Total Cost: $${report.totalCost.toFixed(4)}`);
  lines.push(`Total Tokens: ${report.totalInputTokens.toLocaleString()} in / ${report.totalOutputTokens.toLocaleString()} out\n`);

  // Summary table
  lines.push('## Summary\n');
  lines.push(
    '| Model | ' +
      QUALITY_TESTS.map((t) => t.id.charAt(0).toUpperCase() + t.id.slice(1)).join(' | ') +
      ' | Avg | Format | Date | Cost | Tier |'
  );
  lines.push(
    '|-------|' + QUALITY_TESTS.map(() => ':---:').join('|') + '|:---:|:---:|:---:|---:|------|'
  );

  for (const summary of report.summary.sort((a, b) => b.avgScore - a.avgScore)) {
    const model = MODELS.find((m) => m.id === summary.modelId);
    const scoreStr = summary.scores
      .map((s) => `${s.score}/5`)
      .join(' | ');
    lines.push(
      `| ${summary.modelName} | ${scoreStr} | **${summary.avgScore.toFixed(1)}** | ${summary.avgFormatScore.toFixed(1)}/3 | ${summary.avgDateScore.toFixed(1)}/1 | $${summary.totalCost.toFixed(4)} | ${model?.tier || ''} |`
    );
  }

  // Detailed results by location
  lines.push('\n## Detailed Results\n');

  for (const test of QUALITY_TESTS) {
    lines.push(`### ${test.location}\n`);

    const locationResults = report.results.filter((r) => r.testId === test.id);

    for (const result of locationResults.sort(
      (a, b) => b.score.score - a.score.score
    )) {
      const emoji =
        result.score.score >= 4
          ? '🟢'
          : result.score.score >= 3
            ? '🟡'
            : '🔴';
      lines.push(
        `- **${result.modelName}** ${emoji} ${result.score.score}/5: ${result.score.reasoning}`
      );

      if (result.score.goodSpotsFound.length > 0) {
        lines.push(
          `  - Found: ${result.score.goodSpotsFound.slice(0, 6).join(', ')}`
        );
      }
      if (result.score.redFlagsFound.length > 0) {
        lines.push(
          `  - Red flags: ${result.score.redFlagsFound.join(', ')}`
        );
      }
    }
    lines.push('');
  }

  // Recommendations
  lines.push('## Recommendations\n');

  const bestBudget = report.summary
    .filter((s) => {
      const m = MODELS.find((m) => m.id === s.modelId);
      return m?.tier === 'ultra-budget' || m?.tier === 'budget';
    })
    .sort((a, b) => b.avgScore - a.avgScore)[0];

  const bestQuality = report.summary
    .filter((s) => {
      const m = MODELS.find((m) => m.id === s.modelId);
      return m?.tier === 'quality';
    })
    .sort((a, b) => b.avgScore - a.avgScore)[0];

  if (bestBudget && bestBudget.avgScore >= 3) {
    const model = MODELS.find((m) => m.id === bestBudget.modelId);
    lines.push(
      `**Best Budget Option:** ${bestBudget.modelName} (${bestBudget.avgScore.toFixed(1)}/5) - $${model?.inputCostPer1M}/1M input`
    );
  }

  if (bestQuality) {
    const model = MODELS.find((m) => m.id === bestQuality.modelId);
    lines.push(
      `**Best Quality Option:** ${bestQuality.modelName} (${bestQuality.avgScore.toFixed(1)}/5) - $${model?.inputCostPer1M}/1M input`
    );
  }

  const cheapestGood = report.summary
    .filter((s) => s.avgScore >= 3)
    .map((s) => ({ ...s, model: MODELS.find((m) => m.id === s.modelId)! }))
    .sort((a, b) => a.model.inputCostPer1M - b.model.inputCostPer1M)[0];

  if (cheapestGood) {
    lines.push(
      `\n**Recommendation:** Use **${cheapestGood.modelName}** - achieves ${cheapestGood.avgScore.toFixed(1)}/5 quality at $${cheapestGood.model.inputCostPer1M}/1M input`
    );
  } else {
    lines.push(
      '\n**Warning:** No budget model achieved ≥3/5 quality. Consider building a curated spots database.'
    );
  }

  return lines.join('\n');
}

// Print summary table to console
function printSummary(report: QualityReport) {
  logHeader('Quality Test Results');

  // Print cost summary first
  log(`${colors.dim}Total cost: $${report.totalCost.toFixed(4)} | Tokens: ${report.totalInputTokens.toLocaleString()} in / ${report.totalOutputTokens.toLocaleString()} out${colors.reset}\n`);

  // Header
  const locHeaders = QUALITY_TESTS.map((t) =>
    t.id.charAt(0).toUpperCase() + t.id.slice(1, 4)
  ).join(' │ ');
  console.log(`┌──────────────────┬─${locHeaders.replace(/[^│]/g, '─')}─┬───────┬────────┬─────────────┐`);
  console.log(`│ Model            │ ${locHeaders} │  Avg  │  Cost  │ Tier        │`);
  console.log(`├──────────────────┼─${locHeaders.replace(/[^│]/g, '─')}─┼───────┼────────┼─────────────┤`);

  // Rows sorted by avg score
  for (const summary of report.summary.sort((a, b) => b.avgScore - a.avgScore)) {
    const model = MODELS.find((m) => m.id === summary.modelId);
    const name = summary.modelName.padEnd(16).slice(0, 16);
    const scores = summary.scores
      .map((s) => {
        const color =
          s.score >= 4 ? colors.green : s.score >= 3 ? colors.yellow : colors.red;
        return `${color}${s.score}/5${colors.reset}`;
      })
      .join(' │ ');
    const avg =
      summary.avgScore >= 4
        ? `${colors.green}${summary.avgScore.toFixed(1)}${colors.reset}`
        : summary.avgScore >= 3
          ? `${colors.yellow}${summary.avgScore.toFixed(1)}${colors.reset}`
          : `${colors.red}${summary.avgScore.toFixed(1)}${colors.reset}`;
    const cost = `$${summary.totalCost.toFixed(3)}`.padStart(6);
    const tier = (model?.tier || '').padEnd(11);

    console.log(`│ ${name} │ ${scores} │ ${avg.padStart(13)} │ ${cost} │ ${tier} │`);
  }

  console.log(`└──────────────────┴─${locHeaders.replace(/[^│]/g, '─')}─┴───────┴────────┴─────────────┘`);
}

// Run tests for a single model
async function runModelTests(
  model: ModelConfig,
  tests: QualityTest[],
  runs: number
): Promise<QualityTestResult[]> {
  const results: QualityTestResult[] = [];

  for (let run = 1; run <= runs; run++) {
    for (const test of tests) {
      const runLabel = runs > 1 ? ` [run ${run}/${runs}]` : '';
      process.stdout.write(`  ${test.location}${runLabel}... `);

      const result = await runQualityTest(model, test);
      // Add run number to the result for tracking
      (result as QualityTestResult & { run?: number }).run = run;
      results.push(result);

      if (result.error) {
        console.log(`${colors.red}ERROR${colors.reset}: ${result.error}`);
      } else {
        const scoreColor =
          result.score.score >= 4
            ? colors.green
            : result.score.score >= 3
              ? colors.yellow
              : colors.red;
        console.log(
          `${scoreColor}${result.score.score}/5${colors.reset} (${result.latencyMs}ms) - ${result.score.reasoning}`
        );
      }
    }
  }

  return results;
}

// Main
async function main() {
  const { models, locations, runs, parallel } = parseArgs();

  log(`\n${colors.bold}PhotoScout Quality Tests${colors.reset}`);
  log(
    `${colors.dim}Testing ${models.length} model(s) × ${locations.length} location(s) × ${runs} run(s)${parallel ? ' (parallel)' : ''}${colors.reset}\n`
  );

  // Check available models
  const unavailable = models.filter((id) => {
    const m = MODELS.find((m) => m.id === id);
    return m && !isModelAvailable(m);
  });
  if (unavailable.length > 0) {
    log(`${colors.yellow}⚠${colors.reset} Missing API keys for: ${unavailable.join(', ')}`);
  }

  const startTime = Date.now();
  let results: QualityTestResult[] = [];

  // Get test cases
  const tests = QUALITY_TESTS.filter((t) => locations.includes(t.id));

  // Get available models
  const availableModels = models
    .map((id) => MODELS.find((m) => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined && isModelAvailable(m));

  if (parallel) {
    // Run all models in parallel
    log(`${colors.cyan}ℹ${colors.reset} Running ${availableModels.length} models in parallel...`);

    const allPromises = availableModels.map(async (model) => {
      const modelResults: QualityTestResult[] = [];
      for (let run = 1; run <= runs; run++) {
        for (const test of tests) {
          const result = await runQualityTest(model, test);
          (result as QualityTestResult & { run?: number }).run = run;
          modelResults.push(result);
        }
      }
      return { model, results: modelResults };
    });

    const parallelResults = await Promise.all(allPromises);

    // Print results after all complete
    for (const { model, results: modelResults } of parallelResults) {
      logHeader(`${model.name}`);
      for (const result of modelResults) {
        const runLabel = runs > 1 ? ` [run ${(result as QualityTestResult & { run?: number }).run}]` : '';
        if (result.error) {
          log(`  ${result.location}${runLabel}: ${colors.red}ERROR${colors.reset} - ${result.error}`);
        } else {
          const scoreColor =
            result.score.score >= 4
              ? colors.green
              : result.score.score >= 3
                ? colors.yellow
                : colors.red;
          log(
            `  ${result.location}${runLabel}: ${scoreColor}${result.score.score}/5${colors.reset} (${result.latencyMs}ms) - ${result.score.reasoning}`
          );
        }
      }
      results.push(...modelResults);
    }
  } else {
    // Run sequentially
    for (const model of availableModels) {
      logHeader(`Testing ${model.name}`);
      const modelResults = await runModelTests(model, tests, runs);
      results.push(...modelResults);
    }
  }

  // Build summaries - average scores per location across runs
  const summaries: QualityModelSummary[] = [];
  const modelIds = [...new Set(results.map((r) => r.modelId))];
  const locationIds = [...new Set(results.map((r) => r.testId))];

  for (const modelId of modelIds) {
    const modelResults = results.filter((r) => r.modelId === modelId);

    // Average scores per location (across runs)
    const scores = locationIds.map((locId) => {
      const locResults = modelResults.filter((r) => r.testId === locId);
      if (locResults.length === 0) return null;

      const avgScore = locResults.reduce((sum, r) => sum + r.score.score, 0) / locResults.length;
      const avgFormat = locResults.reduce((sum, r) => sum + r.score.formatScore, 0) / locResults.length;
      const avgDate = locResults.reduce((sum, r) => sum + r.score.dateScore, 0) / locResults.length;

      return {
        location: locResults[0].location,
        score: Math.round(avgScore * 10) / 10, // Round to 1 decimal
        formatScore: Math.round(avgFormat * 10) / 10,
        dateScore: Math.round(avgDate * 10) / 10,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const avgFormatScore = scores.reduce((sum, s) => sum + s.formatScore, 0) / scores.length;
    const avgDateScore = scores.reduce((sum, s) => sum + s.dateScore, 0) / scores.length;
    const totalCost = modelResults.reduce((sum, r) => sum + (r.cost || 0), 0);

    summaries.push({
      modelId,
      modelName: modelResults[0].modelName,
      scores,
      avgScore: Math.round(avgScore * 10) / 10,
      avgFormatScore: Math.round(avgFormatScore * 10) / 10,
      avgDateScore: Math.round(avgDateScore * 10) / 10,
      totalCost,
      notes: getScoreNotes(avgScore),
    });
  }

  // Calculate totals
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalInputTokens = results.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
  const totalOutputTokens = results.reduce((sum, r) => sum + (r.outputTokens || 0), 0);

  const report: QualityReport = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    results,
    summary: summaries,
  };

  // Print and save
  printSummary(report);

  // Save results
  const resultsDir = new URL('../results', import.meta.url).pathname;
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const jsonPath = `${resultsDir}/quality-results.json`;
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log(`\n${colors.cyan}ℹ${colors.reset} Results saved to ${jsonPath}`);

  const mdPath = `${resultsDir}/quality-report.md`;
  writeFileSync(mdPath, generateMarkdownReport(report));
  log(`${colors.cyan}ℹ${colors.reset} Report saved to ${mdPath}`);

  const htmlPath = `${resultsDir}/quality-report.html`;
  writeFileSync(htmlPath, generateHtmlReport(report));
  log(`${colors.cyan}ℹ${colors.reset} HTML report saved to ${htmlPath}`);
}

main().catch(console.error);
