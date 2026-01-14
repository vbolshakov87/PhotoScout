/**
 * Photography Quality Tests
 *
 * Verify models recommend real photography spots, not generic tourist advice.
 */

/**
 * Simplified system prompt for quality testing.
 * Focuses on getting direct photography spot recommendations without conversational flow.
 */
export const QUALITY_TEST_SYSTEM_PROMPT = `You are a photography trip planning expert. Your job is to recommend specific, real photography locations.

When a user asks about photographing a destination:
1. Provide 4-6 specific photography spots with exact names
2. Include GPS coordinates (lat/lng) for each spot
3. Recommend best times for shooting (sunrise, sunset, golden hour, blue hour)
4. Give composition tips and what makes each spot special for photographers
5. Mention any access requirements, hiking distances, or practical tips

Focus on:
- Specific named locations, not generic areas
- Real coordinates that photographers can use
- Timing recommendations (when to arrive, best light)
- Photographer-specific insights (not tourist attractions)

Respond in a helpful, informative way. Do NOT ask clarifying questions - provide recommendations based on the information given.`;

export interface QualityTest {
  id: string;
  name: string;
  location: string;
  prompt: string;
  expectedDate: string; // e.g., "late September", "mid-October", "early May"
  goodSpots: string[];
  redFlags: string[];
  mustHave: string[];
}

export interface QualityScore {
  // Content quality (0-5)
  contentScore: number;
  maxContentScore: number;
  // Format compliance (0-3)
  formatScore: number;
  maxFormatScore: number;
  // Date accuracy (0-1)
  dateScore: number;
  // Combined score for backwards compatibility
  score: number;
  maxScore: number;
  // Details
  goodSpotsFound: string[];
  redFlagsFound: string[];
  missingMustHave: string[];
  hasValidJson: boolean;
  jsonStartsClean: boolean;
  dateReflected: boolean;
  reasoning: string;
}

export interface QualityTestResult {
  modelId: string;
  modelName: string;
  testId: string;
  location: string;
  score: QualityScore;
  latencyMs: number;
  response: string;
  // Token usage and cost
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  error?: string;
}

export interface QualityReport {
  timestamp: string;
  duration: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  results: QualityTestResult[];
  summary: QualityModelSummary[];
}

export interface QualityModelSummary {
  modelId: string;
  modelName: string;
  scores: { location: string; score: number; formatScore: number; dateScore: number }[];
  avgScore: number;
  avgFormatScore: number;
  avgDateScore: number;
  totalCost: number;
  notes: string;
}

// Score definitions for reference
export const QUALITY_SCORES: Record<number, string> = {
  0: 'Generic tourist advice, no photo-specific spots',
  1: 'Mentions 1-2 obvious spots without photo context',
  2: 'Good spots but wrong timing/generic descriptions',
  3: 'Good spots + correct golden hour timing',
  4: 'Great spots + timing + composition tips',
  5: 'Hidden gems + specific viewpoints + photographer insights',
};

// Quality test cases
// NOTE: Prompts include full context (dates, duration, interests) so models skip
// clarifying questions and provide direct photography spot recommendations.
export const QUALITY_TESTS: QualityTest[] = [
  {
    id: 'lofoten',
    name: 'Lofoten Photography Quality',
    location: 'Lofoten, Norway',
    prompt:
      'I want to photograph Lofoten, Norway for 3 days in late September, focusing on landscapes and golden hour. Please recommend specific photography spots with coordinates, best times for shooting, and any composition tips.',
    expectedDate: 'september',
    goodSpots: [
      'Reine',
      'Hamnøy',
      'Kvalvika',
      'Unstad',
      'Reinebringen',
      'Sakrisøy',
      'Å ', // The village of Å
      'Nusfjord',
      'Uttakleiv',
      'Skagsanden',
    ],
    redFlags: [
      'visit lofoten',
      'beautiful scenery',
      'amazing views',
      'stunning landscapes',
      'breathtaking',
    ],
    mustHave: ['sunrise', 'sunset', 'golden hour', 'coordinates'],
  },
  {
    id: 'slovenia',
    name: 'Slovenia Photography Quality',
    location: 'Slovenia',
    prompt:
      'I want to photograph Slovenia for 3 days in mid-October, focusing on landscapes and golden hour. Please recommend specific photography spots with coordinates, best times for shooting, and any composition tips.',
    expectedDate: 'october',
    goodSpots: [
      'Bled',
      'Bohinj',
      'Mangart',
      'Julian Alps',
      'Jasna',
      'Vršič',
      'Škocjan',
      'Savica',
      'Triglav',
      'Pericnik',
      'Zelenci',
    ],
    redFlags: [
      'Postojna Cave',
      'Ljubljana center',
      'visit slovenia',
      'beautiful country',
      'amazing views',
    ],
    mustHave: ['sunrise', 'sunset', 'golden hour', 'coordinates'],
  },
  {
    id: 'paris',
    name: 'Paris Photography Quality',
    location: 'Paris, France',
    prompt:
      'I want to photograph Paris for 3 days in early May, focusing on cityscapes and golden hour. Please recommend specific photography spots with coordinates, best times for shooting, and any composition tips.',
    expectedDate: 'may',
    goodSpots: [
      'Trocadéro',
      'Trocadero',
      'Bir-Hakeim',
      'Bir Hakeim',
      'Montmartre',
      'Pont Alexandre',
      'Alexandre III',
      'Palais Royal',
      'Sacré-Cœur',
      'Sacre-Coeur',
      'Sacre Coeur',
      'Le Marais',
      'Louvre pyramid',
      'Pont des Arts',
      'Rue Crémieux',
      'Cremieux',
    ],
    redFlags: [
      'Champs-Élysées',
      'Champs Elysees',
      'Disneyland',
      'see the eiffel tower',
      'visit the eiffel',
      'amazing city',
      'beautiful city',
    ],
    mustHave: ['sunrise', 'sunset', 'blue hour', 'golden hour', 'coordinates'],
  },
];

/**
 * Try to extract JSON from response, even if there's text before/after it
 */
export function extractJson(response: string): { json: unknown | null; startsClean: boolean } {
  const trimmed = response.trim();
  const startsClean = trimmed.startsWith('{');

  // Try direct parse first
  try {
    return { json: JSON.parse(trimmed), startsClean };
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { json: JSON.parse(jsonMatch[0]), startsClean };
      } catch {
        return { json: null, startsClean };
      }
    }
    return { json: null, startsClean };
  }
}

/**
 * Score a quality test response
 */
export function scoreQualityResponse(
  response: string,
  test: QualityTest
): QualityScore {
  const responseLower = response.toLowerCase();

  // Find good spots mentioned
  const goodSpotsFound = test.goodSpots.filter((spot) =>
    responseLower.includes(spot.toLowerCase())
  );

  // Find red flags present
  const redFlagsFound = test.redFlags.filter((flag) =>
    responseLower.includes(flag.toLowerCase())
  );

  // Find missing must-have elements
  const missingMustHave = test.mustHave.filter(
    (item) => !responseLower.includes(item.toLowerCase())
  );

  // Check for coordinates (lat/lng patterns)
  const hasCoordinates =
    /\d{1,3}\.\d{2,}/g.test(response) || // decimal degrees
    /"lat"/.test(responseLower) ||
    /"lng"/.test(responseLower) ||
    /latitude/i.test(response);

  // Check for JSON and format compliance
  const { json, startsClean } = extractJson(response);
  const hasValidJson = json !== null;

  // Check if date is reflected in response
  const dateReflected = responseLower.includes(test.expectedDate.toLowerCase());

  // === CONTENT SCORE (0-5) ===
  let contentScore = 0;

  // Base score from good spots (0-3 points)
  if (goodSpotsFound.length >= 5) contentScore += 3;
  else if (goodSpotsFound.length >= 3) contentScore += 2;
  else if (goodSpotsFound.length >= 1) contentScore += 1;

  // Timing bonus (+1 point)
  const timingTerms = ['sunrise', 'sunset', 'golden hour', 'blue hour'];
  const hasTimingMissing = missingMustHave.some((m) =>
    timingTerms.includes(m.toLowerCase())
  );
  if (!hasTimingMissing) {
    contentScore += 1;
  }

  // Coordinates bonus (+1 point)
  if (hasCoordinates) {
    contentScore += 1;
  }

  // Red flag penalty (-1 per flag, min 0)
  contentScore = Math.max(0, contentScore - redFlagsFound.length);

  // Cap at 5
  contentScore = Math.min(5, contentScore);

  // === FORMAT SCORE (0-3) ===
  let formatScore = 0;
  // +1 for valid JSON anywhere in response
  if (hasValidJson) formatScore += 1;
  // +1 for JSON starting clean (no preamble)
  if (startsClean && hasValidJson) formatScore += 1;
  // +1 for having required JSON fields (if JSON exists)
  if (hasValidJson && json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (obj.spots || obj.locations || obj.dailySchedule) {
      formatScore += 1;
    }
  }

  // === DATE SCORE (0-1) ===
  const dateScore = dateReflected ? 1 : 0;

  // === COMBINED SCORE (for backwards compatibility) ===
  // Weighted: content is most important
  const score = contentScore;

  // Build reasoning
  const parts: string[] = [];
  parts.push(`${goodSpotsFound.length} spots`);
  if (redFlagsFound.length > 0) {
    parts.push(`${redFlagsFound.length} red flags`);
  }
  if (!hasTimingMissing) {
    parts.push('timing ✓');
  }
  if (hasCoordinates) {
    parts.push('coords ✓');
  }
  if (dateReflected) {
    parts.push('date ✓');
  }
  if (hasValidJson) {
    parts.push(startsClean ? 'JSON ✓' : 'JSON (preamble)');
  }

  return {
    contentScore,
    maxContentScore: 5,
    formatScore,
    maxFormatScore: 3,
    dateScore,
    score,
    maxScore: 5,
    goodSpotsFound,
    redFlagsFound,
    missingMustHave: hasCoordinates
      ? missingMustHave.filter((m) => m !== 'coordinates')
      : missingMustHave,
    hasValidJson,
    jsonStartsClean: startsClean && hasValidJson,
    dateReflected,
    reasoning: parts.join(', '),
  };
}

/**
 * Get quality test by ID
 */
export function getQualityTestById(id: string): QualityTest | undefined {
  return QUALITY_TESTS.find((t) => t.id === id);
}

/**
 * Generate notes based on average score
 */
export function getScoreNotes(avgScore: number): string {
  if (avgScore >= 4.5) return 'Excellent - photographer-level advice';
  if (avgScore >= 4.0) return 'Great - specific spots + timing';
  if (avgScore >= 3.5) return 'Good - solid recommendations';
  if (avgScore >= 3.0) return 'Acceptable - basic photo spots';
  if (avgScore >= 2.0) return 'Weak - tourist-heavy answers';
  return 'Poor - generic advice only';
}
