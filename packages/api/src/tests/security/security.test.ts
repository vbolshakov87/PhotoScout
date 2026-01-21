/**
 * Security Test Suite for PhotoScout
 *
 * Tests the AI's resistance to various attack vectors including:
 * - Prompt injection
 * - Jailbreaks
 * - Data extraction
 * - Context manipulation
 * - Off-topic abuse
 * - Photography-adjacent attacks
 * - Encoding tricks
 *
 * Run with: pnpm test:security
 * Or: pnpm vitest run src/tests/security/security.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ATTACK_VECTORS,
  getAttacksByCategory,
  getCriticalAttacks,
  getControlGroup,
  ATTACK_STATS,
  type AttackVector,
} from './attack-vectors';
import {
  evaluateAttack,
  generateSummary,
  formatSummaryMarkdown,
  type TestResult,
} from './test-utils';

// Store all results for final report
const allResults: TestResult[] = [];

// Timeout for each test (API calls can be slow)
const TEST_TIMEOUT = 60000;

// Rate limiting: wait between tests to avoid overwhelming API
const DELAY_BETWEEN_TESTS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('PhotoScout Security Tests', () => {
  beforeAll(() => {
    console.log('\n🔒 Starting Security Test Suite');
    console.log(`📊 Total attack vectors: ${ATTACK_STATS.total}`);
    console.log('Categories:', JSON.stringify(ATTACK_STATS.byCategory, null, 2));
    console.log('Severities:', JSON.stringify(ATTACK_STATS.bySeverity, null, 2));
  });

  afterAll(async () => {
    // Generate and save report
    const summary = generateSummary(allResults);
    const markdown = formatSummaryMarkdown(summary);

    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save markdown report
    fs.writeFileSync(path.join(resultsDir, `security-report-${timestamp}.md`), markdown);

    // Save JSON results
    fs.writeFileSync(
      path.join(resultsDir, `security-results-${timestamp}.json`),
      JSON.stringify({ summary, results: allResults }, null, 2)
    );

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(
      `Total: ${summary.totalTests} | Passed: ${summary.passed} | Failed: ${summary.failed}`
    );
    console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);

    if (summary.criticalFailures.length > 0) {
      console.log(`\n⚠️  CRITICAL FAILURES: ${summary.criticalFailures.length}`);
      for (const f of summary.criticalFailures) {
        console.log(`   - ${f.attackId}: ${f.failureReason}`);
      }
    }

    if (summary.leakageDetected.length > 0) {
      console.log(`\n🚨 SYSTEM PROMPT LEAKAGE DETECTED: ${summary.leakageDetected.length} cases`);
    }

    console.log(`\n📁 Results saved to: ${resultsDir}`);
  });

  // ==========================================
  // CRITICAL ATTACKS (must pass)
  // ==========================================
  describe('Critical Attacks', () => {
    const criticalAttacks = getCriticalAttacks();

    it.each(criticalAttacks.map((a) => [a.id, a]))(
      '%s: should resist critical attack',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        expect(result.metrics.containsLeakage).toBe(false);
        expect(result.passed).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // PROMPT INJECTION
  // ==========================================
  describe('Prompt Injection Attacks', () => {
    const attacks = getAttacksByCategory('prompt_injection');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should resist prompt injection',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should not leak system prompt
        expect(result.metrics.containsLeakage).toBe(false);

        // Should either refuse or redirect to photography
        expect(result.metrics.isOnTopic || result.metrics.refusedRequest).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // JAILBREAKS
  // ==========================================
  describe('Jailbreak Attacks', () => {
    const attacks = getAttacksByCategory('jailbreak');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should resist jailbreak',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should not leak system prompt
        expect(result.metrics.containsLeakage).toBe(false);

        // Should stay on topic
        expect(result.metrics.isOnTopic || result.metrics.refusedRequest).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // DATA EXTRACTION
  // ==========================================
  describe('Data Extraction Attacks', () => {
    const attacks = getAttacksByCategory('data_extraction');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should prevent data extraction',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Critical: Never leak system prompt
        expect(result.metrics.containsLeakage).toBe(false);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // CONTEXT MANIPULATION
  // ==========================================
  describe('Context Manipulation Attacks', () => {
    const attacks = getAttacksByCategory('context_manipulation');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should resist context manipulation',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should not follow fake context
        expect(result.metrics.isOnTopic || result.metrics.refusedRequest).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // OFF-TOPIC ABUSE
  // ==========================================
  describe('Off-Topic Requests', () => {
    const attacks = getAttacksByCategory('off_topic').filter((a) => a.subcategory !== 'legitimate');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should refuse off-topic request',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should redirect to photography or politely refuse
        expect(result.metrics.isOnTopic || result.metrics.refusedRequest).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // PHOTOGRAPHY-ADJACENT ATTACKS
  // ==========================================
  describe('Photography-Adjacent Attacks', () => {
    const attacks = getAttacksByCategory('photography_adjacent');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should refuse harmful photography request',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should refuse harmful requests even if photography-related
        expect(result.passed).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // ENCODING TRICKS
  // ==========================================
  describe('Encoding Tricks', () => {
    const attacks = getAttacksByCategory('encoding_tricks');

    it.each(attacks.map((a) => [a.id, a]))(
      '%s: should resist encoded injection',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should not follow encoded instructions
        expect(result.metrics.isOnTopic || result.metrics.refusedRequest).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  // ==========================================
  // CONTROL GROUP (should pass)
  // ==========================================
  describe('Control Group - Legitimate Requests', () => {
    const legitimateRequests = getControlGroup();

    it.each(legitimateRequests.map((a) => [a.id, a]))(
      '%s: should accept legitimate photography request',
      async (_id, attack) => {
        const result = await evaluateAttack(attack as AttackVector);
        allResults.push(result);

        await delay(DELAY_BETWEEN_TESTS);

        // Should be on topic and helpful
        expect(result.metrics.isOnTopic).toBe(true);

        // Should NOT refuse legitimate requests
        // (although polite redirect to ask for dates is fine)
      },
      TEST_TIMEOUT
    );
  });
});

// ==========================================
// QUICK SMOKE TEST (for CI)
// ==========================================
describe('Quick Security Smoke Test', () => {
  it(
    'should pass basic security checks',
    async () => {
      // Test most critical attacks quickly
      const quickTests = [
        ATTACK_VECTORS.find((a) => a.id === 'PI-001')!, // Direct override
        ATTACK_VECTORS.find((a) => a.id === 'DE-001')!, // System prompt request
        ATTACK_VECTORS.find((a) => a.id === 'JB-001')!, // DAN jailbreak
        ATTACK_VECTORS.find((a) => a.id === 'CTRL-001')!, // Legitimate request
      ];

      const results: TestResult[] = [];
      for (const attack of quickTests) {
        const result = await evaluateAttack(attack);
        results.push(result);
        await delay(500);
      }

      // All critical tests should pass
      const criticalPassed = results
        .filter((r) => r.severity === 'critical')
        .every((r) => r.passed);

      // Control should be on topic
      const controlOnTopic = results
        .filter((r) => r.subcategory === 'legitimate')
        .every((r) => r.metrics.isOnTopic);

      expect(criticalPassed).toBe(true);
      expect(controlOnTopic).toBe(true);
    },
    TEST_TIMEOUT * 4
  );
});
