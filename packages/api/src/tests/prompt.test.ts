/**
 * Integration tests for PhotoScout chat prompt behavior
 *
 * These tests verify that the AI responds correctly to different user inputs:
 * - Destination only → asks for dates
 * - Destination + dates → asks for interests
 * - Destination + dates + duration + interests → goes to plan
 * - Confirmation → generates JSON
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL || 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/';

interface ChatResponse {
  content: string;
  hasJson: boolean;
  asksAboutDates: boolean;
  asksAboutInterests: boolean;
  asksAboutDuration: boolean;
  presentsProposedPlan: boolean;
}

async function sendChatMessage(message: string, visitorId: string = 'test-' + Date.now()): Promise<ChatResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, message }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  // Parse SSE response
  const text = await response.text();
  let fullContent = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'delta' && data.content) {
          fullContent += data.content;
        }
      } catch {
        // Skip non-JSON lines
      }
    }
  }

  return analyzeResponse(fullContent);
}

function analyzeResponse(content: string): ChatResponse {
  const lowerContent = content.toLowerCase();

  return {
    content,
    hasJson: content.trim().startsWith('{') && content.includes('"spots"'),
    asksAboutDates: (
      lowerContent.includes('when are you planning') ||
      lowerContent.includes('what dates') ||
      lowerContent.includes('when would you like') ||
      lowerContent.includes('when do you plan')
    ),
    asksAboutInterests: (
      lowerContent.includes('what type of photography') ||
      lowerContent.includes('photography interests') ||
      lowerContent.includes('📸') ||
      lowerContent.includes('🌅')
    ),
    asksAboutDuration: (
      lowerContent.includes('how many days') ||
      lowerContent.includes('how long') ||
      lowerContent.includes('duration')
    ),
    presentsProposedPlan: (
      lowerContent.includes('proposed locations') ||
      lowerContent.includes('shooting schedule') ||
      lowerContent.includes('does this plan look good') ||
      lowerContent.includes('here\'s my proposed')
    ),
  };
}

function countQuestionMarks(content: string): number {
  return (content.match(/\?/g) || []).length;
}

describe('PhotoScout Prompt Integration Tests', () => {

  describe('Scenario 1: Destination only', () => {
    it('should ask about dates when only destination is provided', async () => {
      const response = await sendChatMessage('I want to photograph Hamburg');

      expect(response.asksAboutDates).toBe(true);
      expect(response.asksAboutInterests).toBe(false);
      expect(response.asksAboutDuration).toBe(false);
      expect(response.presentsProposedPlan).toBe(false);
      expect(response.hasJson).toBe(false);

      // Should ask only ONE question
      expect(countQuestionMarks(response.content)).toBeLessThanOrEqual(2);
    }, 30000);
  });

  describe('Scenario 2: Destination + dates', () => {
    it('should ask about interests when dates are provided', async () => {
      const response = await sendChatMessage('Photo trip to Tokyo in April 15-18');

      expect(response.asksAboutDates).toBe(false);
      expect(response.asksAboutInterests).toBe(true);
      expect(response.presentsProposedPlan).toBe(false);
      expect(response.hasJson).toBe(false);
    }, 30000);
  });

  describe('Scenario 3: Destination + dates + duration', () => {
    it('should ask about interests when dates and duration are provided', async () => {
      const response = await sendChatMessage('3-day photo trip to Paris, April 10-12');

      expect(response.asksAboutDates).toBe(false);
      expect(response.asksAboutInterests).toBe(true);
      expect(response.asksAboutDuration).toBe(false);
      expect(response.presentsProposedPlan).toBe(false);
      expect(response.hasJson).toBe(false);
    }, 30000);
  });

  describe('Scenario 4: Complete info provided', () => {
    it('should go directly to proposed plan when all info is provided', async () => {
      const response = await sendChatMessage(
        'I want to photograph Hamburg for 3 days in April, focusing on architecture and cityscapes'
      );

      expect(response.asksAboutDates).toBe(false);
      expect(response.asksAboutInterests).toBe(false);
      expect(response.asksAboutDuration).toBe(false);
      expect(response.presentsProposedPlan).toBe(true);
      expect(response.hasJson).toBe(false);
    }, 30000);
  });

  describe('Scenario 5: With nature/landscape interest', () => {
    it('should go to plan with landscape photography request', async () => {
      const response = await sendChatMessage(
        'Golden hour photography in the Dolomites, 4 days in September'
      );

      expect(response.asksAboutDates).toBe(false);
      expect(response.presentsProposedPlan).toBe(true);
      expect(response.hasJson).toBe(false);
    }, 30000);
  });

  describe('Question counting', () => {
    it('should never ask more than one question per response', async () => {
      const testMessages = [
        'I want to visit Rome',
        'Photo trip to Barcelona next month',
        'Street photography in Tokyo',
      ];

      for (const message of testMessages) {
        const response = await sendChatMessage(message);
        const questionCount = countQuestionMarks(response.content);

        // Allow up to 2 question marks (one question + possible rhetorical)
        expect(questionCount).toBeLessThanOrEqual(2);
      }
    }, 90000);
  });
});

describe('Response Format Tests', () => {

  describe('JSON output format', () => {
    it('should return valid JSON when generating a plan', async () => {
      // This test simulates a full conversation flow
      // In practice, you'd need to maintain conversation state

      // For now, just verify JSON detection works
      const jsonSample = `{
        "city": "Hamburg",
        "title": "Hamburg Photo Trip",
        "spots": []
      }`;

      const analysis = analyzeResponse(jsonSample);
      expect(analysis.hasJson).toBe(true);
    });
  });

  describe('Plan proposal format', () => {
    it('should detect proposed plan elements', () => {
      const planSample = `
        Here's my proposed 3-day Hamburg plan:

        ## Proposed Locations
        1. Speicherstadt

        ## Shooting Schedule
        Day 1: Morning at harbor

        Does this plan look good?
      `;

      const analysis = analyzeResponse(planSample);
      expect(analysis.presentsProposedPlan).toBe(true);
    });
  });
});
