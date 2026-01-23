import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load GOOGLE_API_KEY from root .env file
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.+)/);
const GOOGLE_API_KEY = apiKeyMatch?.[1]?.trim();

const s3Client = new S3Client({ region: 'eu-central-1' });
const MODEL = 'imagen-4.0-fast-generate-001';
const BUCKET_NAME = 'photoscout-plans-707282829805';
const CLOUDFRONT_DOMAIN = 'aiscout.photo';

const NATURE_DESTINATIONS = new Set([
  'Dolomites',
  'Lake Bled',
  'Slovenia',
  'Normandy',
  'Lofoten',
  'Iceland',
  'Scottish Highlands',
  'Swiss Alps',
  'Tuscany',
  'Amalfi Coast',
  'Cinque Terre',
  'Provence',
  'Santorini',
  'Faroe Islands',
  'Norwegian Fjords',
  'Lake Como',
  'Plitvice Lakes',
  'Trolltunga',
  'Madeira',
  'Azores',
  'Cappadocia',
  'Black Forest',
  'Saxon Switzerland',
  'Bavarian Alps',
  'Rhine Valley',
  'Moselle Valley',
  'Berchtesgaden',
  'Lake Constance',
  'Harz Mountains',
  'Romantic Road',
  'Baltic Sea Coast',
  'Patagonia',
  'Banff',
  'Yosemite',
  'Grand Canyon',
  'Antelope Canyon',
  'Monument Valley',
  'Big Sur',
  'Hawaii',
  'Yellowstone',
  'Torres del Paine',
  'Bali',
  'Ha Long Bay',
  'Zhangjiajie',
  'Maldives',
  'New Zealand',
  'Great Barrier Reef',
  'Milford Sound',
  'Mount Fuji',
  'Guilin',
  'Sahara Desert',
  'Serengeti',
  'Victoria Falls',
  'Namib Desert',
]);

const TOP_CITIES = [
  'Tokyo',
  'Paris',
  'New York',
  'London',
  'Rome',
  'Barcelona',
  'Amsterdam',
  'Berlin',
  'Vienna',
  'Prague',
  'Lisbon',
  'Copenhagen',
  'Stockholm',
  'Oslo',
  'Bergen',
  'Dubai',
  'Singapore',
  'Hong Kong',
  'Sydney',
  'Melbourne',
  'San Francisco',
  'Los Angeles',
  'Chicago',
  'Miami',
  'Boston',
  'Vancouver',
  'Toronto',
  'Montreal',
  'Rio de Janeiro',
  'Buenos Aires',
  'Cape Town',
  'Marrakech',
  'Istanbul',
  'Athens',
  'Florence',
  'Venice',
  'Munich',
  'Zurich',
  'Brussels',
  'Dublin',
];

const TOP_NATURE_REGIONS = [
  'Dolomites',
  'Swiss Alps',
  'Scottish Highlands',
  'Lofoten',
  'Norwegian Fjords',
  'Trolltunga',
  'Faroe Islands',
  'Lake Bled',
  'Tuscany',
  'Amalfi Coast',
  'Cinque Terre',
  'Provence',
  'Santorini',
  'Lake Como',
  'Plitvice Lakes',
  'Iceland',
  'Normandy',
  'Madeira',
  'Azores',
  'Slovenia',
  'Black Forest',
  'Saxon Switzerland',
  'Bavarian Alps',
  'Rhine Valley',
  'Moselle Valley',
  'Berchtesgaden',
  'Lake Constance',
  'Harz Mountains',
  'Romantic Road',
  'Baltic Sea Coast',
  'Cappadocia',
  'Banff',
  'Yosemite',
  'Grand Canyon',
  'Antelope Canyon',
  'Monument Valley',
  'Big Sur',
  'Hawaii',
  'Yellowstone',
  'Patagonia',
  'Torres del Paine',
  'Bali',
  'Ha Long Bay',
  'Zhangjiajie',
  'Maldives',
  'New Zealand',
  'Milford Sound',
  'Mount Fuji',
  'Guilin',
  'Great Barrier Reef',
  'Sahara Desert',
  'Serengeti',
  'Victoria Falls',
  'Namib Desert',
];

const TOP_DESTINATIONS = [...TOP_CITIES, ...TOP_NATURE_REGIONS];

function isNatureDestination(destination: string): boolean {
  if (NATURE_DESTINATIONS.has(destination)) return true;
  for (const nature of NATURE_DESTINATIONS) {
    if (destination.toLowerCase().includes(nature.toLowerCase())) return true;
  }
  return false;
}

function getDestinationImagePrompt(destination: string): string {
  if (isNatureDestination(destination)) {
    return `Epic cinematic landscape photograph of ${destination} at golden hour. Dramatic sweeping vista showcasing the iconic natural beauty - majestic mountains, pristine lakes, ancient forests, or dramatic coastline. Shot from an elevated viewpoint with layers of depth. Moody atmospheric lighting with sun rays breaking through clouds. Rich colors with deep shadows and golden highlights. Style: National Geographic award-winning landscape photography, 4K, ultra sharp, professional travel photography that inspires wanderlust.`;
  }
  return `Stunning cinematic cityscape photograph of ${destination} at blue hour twilight. Iconic skyline and famous landmarks dramatically lit against a gradient sky. Shot from an elevated perspective showing the city's grandeur and scale. Beautiful city lights beginning to glow, reflections on water if applicable. Rich moody tones with vibrant accent colors. Style: Award-winning travel photography, 4K, ultra sharp, professional architectural photography that captures the soul of the city.`;
}

function getCityImageKey(city: string): string {
  const normalizedCity = city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  return `city-images/${normalizedCity}.png`;
}

async function imageExists(city: string): Promise<boolean> {
  const key = getCityImageKey(city);
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function generateImage(destination: string): Promise<Buffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not set');
  }

  const prompt = getDestinationImagePrompt(destination);
  console.log(`  Prompt: ${prompt.substring(0, 80)}...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as { predictions?: { bytesBase64Encoded?: string }[] };
  const imageData = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new Error('No image data in response');
  }

  return Buffer.from(imageData, 'base64');
}

async function uploadToS3(destination: string, imageData: Buffer): Promise<string> {
  const key = getCityImageKey(destination);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

async function main() {
  const regenerateAll = process.argv.includes('--regenerate-all');
  const startFromArg = process.argv.find((a) => a.startsWith('--start-from='));
  const startFrom = startFromArg?.split('=')[1];

  console.log(
    'Usage: npx tsx generate-missing-images.ts [--regenerate-all] [--start-from=Destination]\n'
  );

  let toGenerate: string[];

  if (regenerateAll) {
    console.log('🔄 REGENERATE ALL MODE - Will regenerate all destination images\n');
    toGenerate = [...TOP_DESTINATIONS];

    if (startFrom) {
      const idx = toGenerate.findIndex((d) => d.toLowerCase() === startFrom.toLowerCase());
      if (idx >= 0) {
        console.log(`⏩ Starting from: ${toGenerate[idx]} (skipping ${idx} destinations)\n`);
        toGenerate = toGenerate.slice(idx);
      } else {
        console.log(`⚠️  Destination "${startFrom}" not found, starting from beginning\n`);
      }
    }
  } else {
    console.log('🔍 Checking for missing destination images...\n');
    toGenerate = [];
    for (const dest of TOP_DESTINATIONS) {
      const exists = await imageExists(dest);
      if (!exists) {
        toGenerate.push(dest);
      }
    }
    console.log(
      `📊 Status: ${TOP_DESTINATIONS.length - toGenerate.length}/${TOP_DESTINATIONS.length} images exist`
    );
  }

  console.log(`🎯 To generate: ${toGenerate.length} images\n`);

  if (toGenerate.length === 0) {
    console.log('✅ All destination images are already generated!');
    return;
  }

  console.log('Destinations to generate:');
  toGenerate.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  console.log('');

  const success: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < toGenerate.length; i++) {
    const dest = toGenerate[i];
    console.log(`\n[${i + 1}/${toGenerate.length}] Generating: ${dest}`);

    try {
      const imageData = await generateImage(dest);
      const url = await uploadToS3(dest, imageData);
      console.log(`  ✅ Uploaded: ${url}`);
      success.push(dest);

      // Delay to avoid rate limiting
      if (i < toGenerate.length - 1) {
        console.log('  ⏳ Waiting 2s...');
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${error}`);
      failed.push(dest);

      // If quota exceeded, stop
      if (String(error).includes('429') || String(error).includes('quota')) {
        console.log('\n⚠️  API quota exceeded. Stopping.');
        console.log(`\n📝 Resume from: ${dest}`);
        console.log(`   Remaining: ${toGenerate.slice(i).join(', ')}`);
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully generated: ${success.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    console.log('Failed destinations:', failed.join(', '));
  }
  const remaining = toGenerate.length - success.length - (failed.length > 0 ? 1 : 0);
  if (remaining > 0) {
    console.log(`⏳ Remaining: ${remaining} (will need another day's quota)`);
  }
}

main().catch(console.error);
