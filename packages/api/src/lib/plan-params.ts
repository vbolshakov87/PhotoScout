/**
 * Extract plan parameters from user message and conversation history
 * Used for cache key generation
 */

export interface PlanParams {
  city: string | null;
  interests: string | null;
  duration: string | null;
}

// Common photography interests keywords
const INTEREST_KEYWORDS = [
  'architecture',
  'cityscape',
  'cityscapes',
  'golden hour',
  'sunrise',
  'sunset',
  'landscape',
  'landscapes',
  'street',
  'street photography',
  'local life',
  'people',
  'night',
  'night photography',
  'city lights',
  'blue hour',
  'seascape',
  'coastal',
  'beach',
  'ocean',
  'nature',
  'wildlife',
  'forest',
  'mountains',
  'portrait',
  'food',
  'macro',
];

// Duration patterns
const DURATION_PATTERNS = [
  /(\d+)\s*days?/i,
  /(\d+)\s*day\s*trip/i,
  /(\d+)-day/i,
  /for\s*(\d+)\s*days?/i,
  /(\d+)\s*nights?/i,
  /a\s*week/i,
  /weekend/i,
];

// Known cities and destinations
const DESTINATIONS = [
  // Cities
  'tokyo',
  'paris',
  'new york',
  'london',
  'rome',
  'barcelona',
  'amsterdam',
  'berlin',
  'vienna',
  'prague',
  'lisbon',
  'copenhagen',
  'stockholm',
  'oslo',
  'bergen',
  'dubai',
  'singapore',
  'hong kong',
  'sydney',
  'melbourne',
  'san francisco',
  'los angeles',
  'chicago',
  'miami',
  'boston',
  'vancouver',
  'toronto',
  'montreal',
  'rio de janeiro',
  'buenos aires',
  'cape town',
  'marrakech',
  'istanbul',
  'athens',
  'florence',
  'venice',
  'munich',
  'zurich',
  'brussels',
  'dublin',
  'hamburg',
  'dresden',
  'cologne',
  // Nature
  'dolomites',
  'swiss alps',
  'scottish highlands',
  'lofoten',
  'norwegian fjords',
  'lake bled',
  'tuscany',
  'amalfi coast',
  'cinque terre',
  'provence',
  'santorini',
  'iceland',
  'faroe islands',
  'lake como',
  'plitvice lakes',
  'black forest',
  'saxon switzerland',
  'bavarian alps',
  'rhine valley',
  'banff',
  'yosemite',
  'grand canyon',
  'antelope canyon',
  'monument valley',
  'big sur',
  'hawaii',
  'yellowstone',
  'patagonia',
  'torres del paine',
  'bali',
  'ha long bay',
  'zhangjiajie',
  'maldives',
  'new zealand',
  'milford sound',
  'mount fuji',
  'guilin',
  'great barrier reef',
  'sahara',
  'serengeti',
  'victoria falls',
  'namib desert',
  'cappadocia',
];

/**
 * Extract plan parameters from a message
 */
export function extractPlanParams(message: string): PlanParams {
  const lowerMessage = message.toLowerCase();

  // Extract city/destination
  let city: string | null = null;
  for (const dest of DESTINATIONS) {
    if (lowerMessage.includes(dest)) {
      city = dest;
      break;
    }
  }

  // Extract interests
  let interests: string | null = null;
  const foundInterests: string[] = [];
  for (const interest of INTEREST_KEYWORDS) {
    if (lowerMessage.includes(interest)) {
      foundInterests.push(interest);
    }
  }
  if (foundInterests.length > 0) {
    interests = foundInterests.slice(0, 3).join('-'); // Max 3 interests
  }

  // Extract duration
  let duration: string | null = null;
  if (lowerMessage.includes('a week') || lowerMessage.includes('one week')) {
    duration = '7';
  } else if (lowerMessage.includes('weekend')) {
    duration = '2';
  } else {
    for (const pattern of DURATION_PATTERNS) {
      const match = lowerMessage.match(pattern);
      if (match && match[1]) {
        duration = match[1];
        break;
      }
    }
  }

  return { city, interests, duration };
}

/**
 * Merge parameters from multiple messages (conversation history)
 */
export function mergeParams(existing: PlanParams, newParams: PlanParams): PlanParams {
  return {
    city: newParams.city || existing.city,
    interests: newParams.interests || existing.interests,
    duration: newParams.duration || existing.duration,
  };
}
