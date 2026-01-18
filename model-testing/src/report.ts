#!/usr/bin/env tsx
/**
 * Generate HTML report from test results
 *
 * Usage: npm run report
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { TestSuiteResult, ModelTestResult, ModelSummary } from './types.js';

function generateHTML(results: TestSuiteResult): string {
  const { timestamp, duration, models, results: testResults } = results;

  // Get unique tests
  const testIds = [...new Set(testResults.map((r) => r.testId))];
  const testNames = Object.fromEntries(testResults.map((r) => [r.testId, r.testName]));

  // Build scoring grid
  const gridRows = testIds.map((testId) => {
    const testName = testNames[testId];
    const cells = models.map((model) => {
      const result = testResults.find((r) => r.modelId === model.id && r.testId === testId);
      if (!result) return { passed: false, score: 0, error: 'Not run' };
      return result;
    });
    return { testId, testName, cells };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoScout Compliance Test Results</title>
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
    .response-preview {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 4px;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-family: monospace;
      font-size: 0.75rem;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
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
    <h1>PhotoScout Compliance Test Results</h1>
    <p class="subtitle">
      Generated: ${new Date(timestamp).toLocaleString()} |
      Duration: ${(duration / 1000).toFixed(1)}s |
      ${models.length} models | ${testIds.length} tests
    </p>

    <!-- Summary Cards -->
    <div class="summary-grid">
      ${[...models]
        .sort((a, b) => b.score - a.score)
        .map((m, i) => {
          const scoreClass = m.score >= 90 ? 'pass' : m.score >= 70 ? 'warn' : 'fail';
          const isWinner = i === 0 && m.score >= 90;
          return `
        <div class="summary-card${isWinner ? ' winner' : ''}">
          <div class="model-name">${m.name}${isWinner ? ' &#127942;' : ''}</div>
          <div class="model-provider">${m.provider}</div>
          <div class="score-large ${scoreClass}">${m.score.toFixed(0)}%</div>
          <div class="stats">
            <span>${m.passed}/${m.totalTests} passed</span>
            <span>${m.avgLatency}ms avg</span>
          </div>
          <div class="cost">$${m.estimatedCostPerConv.toFixed(4)}/conv</div>
        </div>`;
        })
        .join('')}
    </div>

    <!-- Scoring Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Test</th>
            ${models.map((m) => `<th>${m.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${gridRows
            .map(
              (row) => `
            <tr>
              <td class="test-name" title="${row.testName}">${row.testName}</td>
              ${row.cells
                .map((cell) => {
                  if ('error' in cell && cell.error) {
                    return `<td class="cell-error">${cell.error}</td>`;
                  }
                  const r = cell as ModelTestResult;
                  if (r.passed) {
                    return `<td class="cell-pass">PASS</td>`;
                  } else if (r.score >= 0.5) {
                    return `<td class="cell-partial">${(r.score * 100).toFixed(0)}%</td>`;
                  } else {
                    return `<td class="cell-fail">FAIL</td>`;
                  }
                })
                .join('')}
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Detailed Results -->
    <div class="details">
      <h2 style="margin-bottom: 1rem; color: #f0f6fc;">Detailed Results</h2>
      ${testResults
        .map(
          (r) => `
        <div class="detail-card">
          <div class="detail-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span><strong>${r.modelName}</strong> - ${r.testName}</span>
            <span class="${r.passed ? 'check-pass' : 'check-fail'}">${r.passed ? 'PASS' : 'FAIL'} (${(r.score * 100).toFixed(0)}%)</span>
          </div>
          <div class="detail-content">
            <p style="margin-bottom: 0.5rem; color: #8b949e;">Latency: ${r.latencyMs}ms</p>
            ${r.error ? `<p style="color: #f85149;">Error: ${r.error}</p>` : ''}
            <ul class="check-list">
              ${r.checks
                .map(
                  (c) => `
                <li class="check-item">
                  <span class="${c.passed ? 'check-pass' : 'check-fail'}">${c.passed ? '&#x2713;' : '&#x2717;'}</span>
                  ${c.name}${c.details ? ` <span style="color: #8b949e;">(${c.details})</span>` : ''}
                </li>`
                )
                .join('')}
            </ul>
            ${
              r.responses.length > 0
                ? `
              <p style="margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600;">Response:</p>
              <div class="response-preview">${escapeHtml(r.responses[r.responses.length - 1]?.substring(0, 500) || '')}</div>
            `
                : ''
            }
          </div>
        </div>`
        )
        .join('')}
    </div>

    <!-- Recommendation -->
    <div style="background: #161b22; border: 1px solid #238636; border-radius: 8px; padding: 1.5rem; margin-top: 2rem;">
      <h3 style="color: #3fb950; margin-bottom: 0.5rem;">Recommendation</h3>
      ${getRecommendation(models)}
    </div>

    <div class="footer">
      PhotoScout Model Testing Framework | Results from ${new Date(timestamp).toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRecommendation(models: ModelSummary[]): string {
  const sorted = [...models].sort((a, b) => b.score - a.score);
  const passing = sorted.filter((m) => m.score >= 90);

  if (passing.length === 0) {
    return `<p>No model achieved >=90% pass rate. Consider:</p>
      <ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
        <li>Simplifying the system prompt</li>
        <li>Breaking JSON output into smaller parts</li>
        <li>Using structured output/function calling</li>
      </ul>`;
  }

  // Find cheapest passing model
  const cheapest = passing.sort((a, b) => a.estimatedCostPerConv - b.estimatedCostPerConv)[0];

  return `<p><strong>${cheapest.name}</strong> is recommended:</p>
    <ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
      <li>Score: ${cheapest.score.toFixed(0)}% (${cheapest.passed}/${cheapest.totalTests} tests passed)</li>
      <li>Average latency: ${cheapest.avgLatency}ms</li>
      <li>Estimated cost: <span class="cost">$${cheapest.estimatedCostPerConv.toFixed(4)}</span> per conversation</li>
    </ul>
    ${
      passing.length > 1
        ? `<p style="margin-top: 0.5rem; color: #8b949e;">Other passing models: ${passing
            .slice(1)
            .map((m) => m.name)
            .join(', ')}</p>`
        : ''
    }`;
}

async function main() {
  const resultsPath = new URL('../results/compliance-results.json', import.meta.url).pathname;
  const reportPath = new URL('../results/compliance-report.html', import.meta.url).pathname;

  if (!existsSync(resultsPath)) {
    console.error('No results found. Run tests first: npm test');
    process.exit(1);
  }

  const results: TestSuiteResult = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  const html = generateHTML(results);

  writeFileSync(reportPath, html);
  console.log(`Report generated: ${reportPath}`);
  console.log(`Open with: npm run view`);
}

main().catch(console.error);
