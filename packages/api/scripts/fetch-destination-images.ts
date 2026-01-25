/**
 * Pre-fetches destination images by calling the /api/destinations/:id endpoint
 * This triggers the Lambda to lazily load images from Unsplash and cache them
 *
 * Usage:
 *   pnpm images:fetch                                    # All 89 destinations
 *   pnpm images:fetch -- --destination=new-york          # Single destination by ID
 *   pnpm images:fetch -- --type=city                     # All cities only
 *   pnpm images:fetch -- --type=nature --region=europe   # Nature destinations in Europe
 *   pnpm images:fetch -- --limit 5                       # First 5 only
 *   pnpm images:fetch -- --dry-run                       # Preview without API calls
 */

const API_BASE = 'https://aiscout.photo';
// Rate limit: 30 req/min for production, so ~2000ms between requests
const RATE_LIMIT_RPM = 30;
const DELAY_MS = Math.ceil(60000 / RATE_LIMIT_RPM); // 2000ms

// Pre-defined destinations for cache warming (89 total)
// Users can request ANY destination via API - these are just suggestions for pre-warming
const SUGGESTED_DESTINATIONS: Array<{
  id: string;
  name: string;
  type: 'city' | 'nature';
  region?: string;
}> = [
  // Cities (40)
  { id: 'tokyo', name: 'Tokyo', type: 'city' },
  { id: 'paris', name: 'Paris', type: 'city' },
  { id: 'new-york', name: 'New York', type: 'city' },
  { id: 'london', name: 'London', type: 'city' },
  { id: 'rome', name: 'Rome', type: 'city' },
  { id: 'barcelona', name: 'Barcelona', type: 'city' },
  { id: 'amsterdam', name: 'Amsterdam', type: 'city' },
  { id: 'berlin', name: 'Berlin', type: 'city' },
  { id: 'vienna', name: 'Vienna', type: 'city' },
  { id: 'prague', name: 'Prague', type: 'city' },
  { id: 'lisbon', name: 'Lisbon', type: 'city' },
  { id: 'copenhagen', name: 'Copenhagen', type: 'city' },
  { id: 'stockholm', name: 'Stockholm', type: 'city' },
  { id: 'oslo', name: 'Oslo', type: 'city' },
  { id: 'bergen', name: 'Bergen', type: 'city' },
  { id: 'dubai', name: 'Dubai', type: 'city' },
  { id: 'singapore', name: 'Singapore', type: 'city' },
  { id: 'hong-kong', name: 'Hong Kong', type: 'city' },
  { id: 'sydney', name: 'Sydney', type: 'city' },
  { id: 'melbourne', name: 'Melbourne', type: 'city' },
  { id: 'san-francisco', name: 'San Francisco', type: 'city' },
  { id: 'los-angeles', name: 'Los Angeles', type: 'city' },
  { id: 'chicago', name: 'Chicago', type: 'city' },
  { id: 'miami', name: 'Miami', type: 'city' },
  { id: 'boston', name: 'Boston', type: 'city' },
  { id: 'vancouver', name: 'Vancouver', type: 'city' },
  { id: 'toronto', name: 'Toronto', type: 'city' },
  { id: 'montreal', name: 'Montreal', type: 'city' },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro', type: 'city' },
  { id: 'buenos-aires', name: 'Buenos Aires', type: 'city' },
  { id: 'cape-town', name: 'Cape Town', type: 'city' },
  { id: 'marrakech', name: 'Marrakech', type: 'city' },
  { id: 'istanbul', name: 'Istanbul', type: 'city' },
  { id: 'athens', name: 'Athens', type: 'city' },
  { id: 'florence', name: 'Florence', type: 'city' },
  { id: 'venice', name: 'Venice', type: 'city' },
  { id: 'munich', name: 'Munich', type: 'city' },
  { id: 'zurich', name: 'Zurich', type: 'city' },
  { id: 'brussels', name: 'Brussels', type: 'city' },
  { id: 'dublin', name: 'Dublin', type: 'city' },
  // Nature - Europe (15)
  { id: 'dolomites', name: 'Dolomites', type: 'nature', region: 'europe' },
  { id: 'swiss-alps', name: 'Swiss Alps', type: 'nature', region: 'europe' },
  { id: 'scottish-highlands', name: 'Scottish Highlands', type: 'nature', region: 'europe' },
  { id: 'lofoten', name: 'Lofoten', type: 'nature', region: 'europe' },
  { id: 'norwegian-fjords', name: 'Norwegian Fjords', type: 'nature', region: 'europe' },
  { id: 'lake-bled', name: 'Lake Bled', type: 'nature', region: 'europe' },
  { id: 'tuscany', name: 'Tuscany', type: 'nature', region: 'europe' },
  { id: 'amalfi-coast', name: 'Amalfi Coast', type: 'nature', region: 'europe' },
  { id: 'cinque-terre', name: 'Cinque Terre', type: 'nature', region: 'europe' },
  { id: 'provence', name: 'Provence', type: 'nature', region: 'europe' },
  { id: 'santorini', name: 'Santorini', type: 'nature', region: 'europe' },
  { id: 'iceland', name: 'Iceland', type: 'nature', region: 'europe' },
  { id: 'faroe-islands', name: 'Faroe Islands', type: 'nature', region: 'europe' },
  { id: 'lake-como', name: 'Lake Como', type: 'nature', region: 'europe' },
  { id: 'plitvice-lakes', name: 'Plitvice Lakes', type: 'nature', region: 'europe' },
  // Nature - Germany (10)
  { id: 'black-forest', name: 'Black Forest', type: 'nature', region: 'germany' },
  { id: 'saxon-switzerland', name: 'Saxon Switzerland', type: 'nature', region: 'germany' },
  { id: 'bavarian-alps', name: 'Bavarian Alps', type: 'nature', region: 'germany' },
  { id: 'rhine-valley', name: 'Rhine Valley', type: 'nature', region: 'germany' },
  { id: 'moselle-valley', name: 'Moselle Valley', type: 'nature', region: 'germany' },
  { id: 'berchtesgaden', name: 'Berchtesgaden', type: 'nature', region: 'germany' },
  { id: 'lake-constance', name: 'Lake Constance', type: 'nature', region: 'germany' },
  { id: 'harz-mountains', name: 'Harz Mountains', type: 'nature', region: 'germany' },
  { id: 'romantic-road', name: 'Romantic Road', type: 'nature', region: 'germany' },
  { id: 'baltic-sea-coast', name: 'Baltic Sea Coast', type: 'nature', region: 'germany' },
  // Nature - Americas (10)
  { id: 'banff', name: 'Banff', type: 'nature', region: 'americas' },
  { id: 'yosemite', name: 'Yosemite', type: 'nature', region: 'americas' },
  { id: 'grand-canyon', name: 'Grand Canyon', type: 'nature', region: 'americas' },
  { id: 'antelope-canyon', name: 'Antelope Canyon', type: 'nature', region: 'americas' },
  { id: 'monument-valley', name: 'Monument Valley', type: 'nature', region: 'americas' },
  { id: 'big-sur', name: 'Big Sur', type: 'nature', region: 'americas' },
  { id: 'hawaii', name: 'Hawaii', type: 'nature', region: 'americas' },
  { id: 'yellowstone', name: 'Yellowstone', type: 'nature', region: 'americas' },
  { id: 'patagonia', name: 'Patagonia', type: 'nature', region: 'americas' },
  { id: 'torres-del-paine', name: 'Torres del Paine', type: 'nature', region: 'americas' },
  // Nature - Asia Pacific (9)
  { id: 'bali', name: 'Bali', type: 'nature', region: 'asia_pacific' },
  { id: 'ha-long-bay', name: 'Ha Long Bay', type: 'nature', region: 'asia_pacific' },
  { id: 'zhangjiajie', name: 'Zhangjiajie', type: 'nature', region: 'asia_pacific' },
  { id: 'maldives', name: 'Maldives', type: 'nature', region: 'asia_pacific' },
  { id: 'new-zealand', name: 'New Zealand', type: 'nature', region: 'asia_pacific' },
  { id: 'milford-sound', name: 'Milford Sound', type: 'nature', region: 'asia_pacific' },
  { id: 'mount-fuji', name: 'Mount Fuji', type: 'nature', region: 'asia_pacific' },
  { id: 'guilin', name: 'Guilin', type: 'nature', region: 'asia_pacific' },
  { id: 'great-barrier-reef', name: 'Great Barrier Reef', type: 'nature', region: 'asia_pacific' },
  // Nature - Africa & Middle East (5)
  { id: 'sahara-desert', name: 'Sahara Desert', type: 'nature', region: 'africa_middle_east' },
  { id: 'serengeti', name: 'Serengeti', type: 'nature', region: 'africa_middle_east' },
  { id: 'victoria-falls', name: 'Victoria Falls', type: 'nature', region: 'africa_middle_east' },
  { id: 'namib-desert', name: 'Namib Desert', type: 'nature', region: 'africa_middle_east' },
  { id: 'cappadocia', name: 'Cappadocia', type: 'nature', region: 'africa_middle_east' },
];

/**
 * Extracts the value for a CLI argument formatted as `--name=value` from an arguments array.
 *
 * @param args - The list of command-line arguments to search.
 * @param name - The argument name to find (without leading dashes).
 * @returns The substring after `=` for the first matching `--name=value` argument, `undefined` if not found.
 */
function getArg(args: string[], name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : undefined;
}

/**
 * Pre-fetches destination images by calling the destinations API for one or multiple destinations and logs the outcomes.
 *
 * Supports CLI flags:
 * - `--destination=<id>` to process a single destination (uses a predefined entry or creates an ad-hoc entry and logs a warning if not predefined)
 * - `--type=<city|nature>` to filter predefined destinations
 * - `--region=<region>` to filter predefined destinations
 * - `--limit <n>` to cap the number of destinations processed
 * - `--dry-run` to list destinations without making network requests
 *
 * For each destination the script calls the /api/destinations/:id endpoint, records whether the response was served from cache, counts successes/cached/failed items, waits DELAY_MS between non-final requests when processing multiple destinations, and exits with a non-zero code if any request fails.
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limitRaw = limitIdx !== -1 ? args[limitIdx + 1] : undefined;
  const limit = limitRaw !== undefined ? parseInt(limitRaw, 10) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
    console.error('❌ --limit requires a positive integer');
    process.exit(1);
  }

  // Single destination mode
  const destinationId = getArg(args, 'destination');
  // Filter by type (city/nature)
  const typeFilter = getArg(args, 'type') as 'city' | 'nature' | undefined;
  // Filter by region (for nature destinations)
  const regionFilter = getArg(args, 'region');

  console.log(`\n🚀 Pre-fetching destination images from ${API_BASE}\n`);

  let toFetch: typeof SUGGESTED_DESTINATIONS;

  if (destinationId) {
    // Single destination mode - find in list or create ad-hoc entry
    const found = SUGGESTED_DESTINATIONS.find((d) => d.id === destinationId);
    if (found) {
      toFetch = [found];
    } else {
      // Ad-hoc destination not in predefined list
      const name = destinationId
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      toFetch = [{ id: destinationId, name, type: typeFilter || 'city', region: regionFilter }];
      console.log(
        `⚠️  Destination "${destinationId}" not in predefined list, using ad-hoc entry\n`
      );
    }
  } else {
    // Batch mode - apply filters
    toFetch = SUGGESTED_DESTINATIONS.filter((d) => {
      if (typeFilter && d.type !== typeFilter) return false;
      if (regionFilter && d.region !== regionFilter) return false;
      return true;
    });
    if (limit) toFetch = toFetch.slice(0, limit);
  }

  console.log(`📍 Processing ${toFetch.length} destination${toFetch.length === 1 ? '' : 's'}...\n`);

  let success = 0,
    cached = 0,
    failed = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const dest = toFetch[i];

    if (dryRun) {
      console.log(`🔍 [DRY RUN] ${dest.name}`);
      continue;
    }

    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/destinations/${dest.id}`);
      const ms = Date.now() - start;

      if (!res.ok) {
        // Handle rate limiting with Retry-After header
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
          console.log(`⏳ ${dest.name}: Rate limited, waiting ${waitTime / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitTime));
          // Retry the same destination by decrementing index
          i--;
          continue;
        }
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
      }

      const data = (await res.json()) as { fromCache: boolean; photographer?: { name: string } };

      if (data.fromCache) {
        console.log(`⏭️  ${dest.name} — cached (${ms}ms)`);
        cached++;
      } else {
        console.log(`✅ ${dest.name} — ${data.photographer?.name || 'fetched'} (${ms}ms)`);
        success++;
      }
    } catch (e) {
      console.log(`❌ ${dest.name}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }

    // Skip delay for single destination or last item
    if (toFetch.length > 1 && i < toFetch.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  if (toFetch.length === 1) {
    // Single destination mode - simpler output
    if (failed > 0) process.exit(1);
  } else {
    console.log(`\n✅ Fetched: ${success} | ⏭️ Cached: ${cached} | ❌ Failed: ${failed}\n`);
    if (failed > 0) process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
