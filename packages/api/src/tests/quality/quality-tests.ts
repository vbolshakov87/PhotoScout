/**
 * Photography Quality Tests for PhotoScout
 *
 * Verify models recommend real photography spots, not generic tourist advice.
 * These tests evaluate the quality of photography knowledge, not security.
 *
 * Scoring criteria:
 * - Content Score (0-5): Good spots found, timing advice, coordinates
 * - Format Score (0-3): Valid JSON, clean output, required fields
 * - Date Score (0-1): Response reflects the specified travel dates
 */

export interface QualityTest {
  id: string;
  name: string;
  location: string;
  prompt: string;
  expectedDate: string; // e.g., "september", "october", "may"
  goodSpots: string[];
  redFlags: string[];
  mustHave: string[];
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

/**
 * Quality test cases for photography destinations.
 *
 * Each test includes:
 * - Full context (dates, duration, interests) so models skip clarifying questions
 * - Expected good spots (real photography locations)
 * - Red flags (generic tourist advice to penalize)
 * - Must-have elements (timing, coordinates)
 */
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
      'Hamnoy',
      'Kvalvika',
      'Unstad',
      'Reinebringen',
      'Sakrisøy',
      'Sakrisoy',
      'Å ', // The village of Å
      'Nusfjord',
      'Uttakleiv',
      'Skagsanden',
      'Ramberg',
      'Flakstad',
    ],
    redFlags: [
      'visit lofoten',
      'beautiful scenery',
      'amazing views',
      'stunning landscapes',
      'breathtaking',
      'picturesque',
      'must-see attraction',
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
      'Vrsic',
      'Škocjan',
      'Skocjan',
      'Savica',
      'Triglav',
      'Peričnik',
      'Pericnik',
      'Zelenci',
      'Vintgar',
      'Jamnik',
      'Slap Kozjak',
    ],
    redFlags: [
      'Postojna Cave',
      'Ljubljana center',
      'visit slovenia',
      'beautiful country',
      'amazing views',
      'stunning scenery',
      'must-see',
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
      'Place de la Concorde',
      'Pont Neuf',
    ],
    redFlags: [
      'Champs-Élysées',
      'Champs Elysees',
      'Disneyland',
      'see the eiffel tower',
      'visit the eiffel',
      'amazing city',
      'beautiful city',
      'must-see attraction',
    ],
    mustHave: ['sunrise', 'sunset', 'blue hour', 'golden hour', 'coordinates'],
  },
];

/**
 * Helper to get a quality test by ID
 */
export function getQualityTestById(id: string): QualityTest | undefined {
  return QUALITY_TESTS.find((t) => t.id === id);
}

/**
 * Keywords that indicate on-topic photography response
 */
export const PHOTOGRAPHY_KEYWORDS = [
  'photography',
  'photo',
  'shoot',
  'shooting',
  'camera',
  'lens',
  'tripod',
  'golden hour',
  'blue hour',
  'sunrise',
  'sunset',
  'composition',
  'foreground',
  'leading lines',
  'long exposure',
  'landscape',
  'cityscape',
];

/**
 * Coordinate patterns to detect in responses
 */
export const COORDINATE_PATTERNS = [
  /\d{1,3}\.\d{2,}/g, // decimal degrees (e.g., 48.8584)
  /"lat"/i, // JSON lat field
  /"lng"/i, // JSON lng field
  /"latitude"/i,
  /"longitude"/i,
  /\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"/g, // DMS format
];

/**
 * Timing-related keywords for scoring
 */
export const TIMING_KEYWORDS = [
  'sunrise',
  'sunset',
  'golden hour',
  'blue hour',
  'morning',
  'evening',
  'dawn',
  'dusk',
];
