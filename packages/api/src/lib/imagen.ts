import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = 'imagen-4.0-fast-generate-001';

// Nature/landscape regions that need a different prompt style
const NATURE_DESTINATIONS = new Set([
  // Europe - General
  'Dolomites', 'Lake Bled', 'Slovenia', 'Normandy', 'Lofoten', 'Iceland',
  'Scottish Highlands', 'Swiss Alps', 'Tuscany', 'Amalfi Coast', 'Cinque Terre',
  'Provence', 'Santorini', 'Faroe Islands', 'Norwegian Fjords', 'Lake Como',
  'Plitvice Lakes', 'Trolltunga', 'Madeira', 'Azores', 'Cappadocia',
  // Germany
  'Black Forest', 'Saxon Switzerland', 'Bavarian Alps', 'Rhine Valley',
  'Moselle Valley', 'Berchtesgaden', 'Lake Constance', 'Harz Mountains',
  'Romantic Road', 'Baltic Sea Coast',
  // Americas
  'Patagonia', 'Banff', 'Yosemite', 'Grand Canyon', 'Antelope Canyon',
  'Monument Valley', 'Big Sur', 'Hawaii', 'Yellowstone', 'Torres del Paine',
  // Asia & Pacific
  'Bali', 'Ha Long Bay', 'Zhangjiajie', 'Maldives', 'New Zealand',
  'Great Barrier Reef', 'Milford Sound', 'Mount Fuji', 'Guilin',
  // Africa
  'Sahara Desert', 'Serengeti', 'Victoria Falls', 'Namib Desert',
]);

function isNatureDestination(destination: string): boolean {
  // Check exact match
  if (NATURE_DESTINATIONS.has(destination)) return true;
  // Check if any nature destination is included in the name
  for (const nature of NATURE_DESTINATIONS) {
    if (destination.toLowerCase().includes(nature.toLowerCase())) return true;
  }
  return false;
}

function getDestinationImagePrompt(destination: string): string {
  if (isNatureDestination(destination)) {
    return `Present a clear, 45 degree top-down isometric miniature 3D cartoon scene of ${destination}, enclosed within the borders of a simple rounded rectangular shape, featuring the iconic natural landscape - mountains, lakes, forests, cliffs, or coastline as appropriate. Use a pastel color palette with soft gradients. The scene should show the dramatic natural beauty with tiny trees, winding paths, maybe small cabins or viewpoints. Include characteristic elements like waterfalls, snow-capped peaks, or unique rock formations. The background should be transparent or a very light solid color. Style: Pixar-inspired 3D illustration, warm golden hour lighting, miniature tilt-shift effect.`;
  }
  return `Present a clear, 45 degree top-down isometric miniature 3D cartoon scene of ${destination}, enclosed within the borders of a simple rounded rectangular shape, featuring famous landmarks and characteristic architecture. Use a pastel color palette with soft gradients. The scene should be detailed but clean, with tiny trees, streets, and recognizable buildings arranged in a charming diorama style. The background should be transparent or a very light solid color. Style: Pixar-inspired 3D illustration, warm lighting, miniature tilt-shift effect.`;
}

function getCityImageKey(city: string): string {
  const normalizedCity = city.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return `city-images/${normalizedCity}.png`;
}

async function cityImageExists(city: string): Promise<boolean> {
  const bucketName = process.env.HTML_PLANS_BUCKET;
  if (!bucketName) return false;

  const key = getCityImageKey(city);

  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

async function uploadImageToS3(city: string, imageData: Buffer): Promise<string> {
  const bucketName = process.env.HTML_PLANS_BUCKET;
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!bucketName) {
    throw new Error('HTML_PLANS_BUCKET environment variable is not set');
  }
  if (!cloudfrontDomain) {
    throw new Error('CLOUDFRONT_DOMAIN environment variable is not set');
  }

  const key = getCityImageKey(city);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageData,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `https://${cloudfrontDomain}/${key}`;
}

async function generateCityImage(city: string): Promise<Buffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  const prompt = getDestinationImagePrompt(city);

  // Using Google Imagen API
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
        parameters: {
          sampleCount: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Imagen] API error:', error);
    throw new Error(`Imagen API error: ${response.status}`);
  }

  const data = await response.json();

  const imageData = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    console.error('[Imagen] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image data in Imagen response');
  }

  return Buffer.from(imageData, 'base64');
}

export async function getCityImageUrl(city: string): Promise<string> {
  const bucketName = process.env.HTML_PLANS_BUCKET;
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!bucketName || !cloudfrontDomain) {
    throw new Error('S3/CloudFront not configured');
  }

  if (await cityImageExists(city)) {
    const key = getCityImageKey(city);
    console.log(`[Imagen] Using cached image for ${city}`);
    return `https://${cloudfrontDomain}/${key}`;
  }

  console.log(`[Imagen] Generating new image for ${city}`);
  const imageData = await generateCityImage(city);

  const url = await uploadImageToS3(city, imageData);
  console.log(`[Imagen] Uploaded image for ${city}: ${url}`);

  return url;
}

export async function getCachedCityImages(cities: string[]): Promise<Record<string, string | null>> {
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
  const result: Record<string, string | null> = {};

  for (const city of cities) {
    if (await cityImageExists(city)) {
      const key = getCityImageKey(city);
      result[city] = `https://${cloudfrontDomain}/${key}`;
    } else {
      result[city] = null;
    }
  }

  return result;
}

// Top city destinations to pre-generate
export const TOP_CITIES = [
  'Tokyo', 'Paris', 'New York', 'London', 'Rome',
  'Barcelona', 'Amsterdam', 'Berlin', 'Vienna', 'Prague',
  'Lisbon', 'Copenhagen', 'Stockholm', 'Oslo', 'Bergen',
  'Dubai', 'Singapore', 'Hong Kong', 'Sydney', 'Melbourne',
  'San Francisco', 'Los Angeles', 'Chicago', 'Miami', 'Boston',
  'Vancouver', 'Toronto', 'Montreal', 'Rio de Janeiro', 'Buenos Aires',
  'Cape Town', 'Marrakech', 'Istanbul', 'Athens', 'Florence',
  'Venice', 'Munich', 'Zurich', 'Brussels', 'Dublin',
];

// Top nature/landscape regions to pre-generate
export const TOP_NATURE_REGIONS = [
  // Europe - Alps & Mountains
  'Dolomites', 'Swiss Alps', 'Scottish Highlands', 'Lofoten', 'Norwegian Fjords',
  'Trolltunga', 'Faroe Islands',
  // Europe - Mediterranean & Lakes
  'Lake Bled', 'Tuscany', 'Amalfi Coast', 'Cinque Terre', 'Provence',
  'Santorini', 'Lake Como', 'Plitvice Lakes',
  // Europe - Atlantic
  'Iceland', 'Normandy', 'Madeira', 'Azores', 'Slovenia',
  // Germany
  'Black Forest', 'Saxon Switzerland', 'Bavarian Alps', 'Rhine Valley',
  'Moselle Valley', 'Berchtesgaden', 'Lake Constance', 'Harz Mountains',
  'Romantic Road', 'Baltic Sea Coast',
  // Middle East
  'Cappadocia',
  // Americas - North
  'Banff', 'Yosemite', 'Grand Canyon', 'Antelope Canyon', 'Monument Valley',
  'Big Sur', 'Hawaii', 'Yellowstone',
  // Americas - South
  'Patagonia', 'Torres del Paine',
  // Asia & Pacific
  'Bali', 'Ha Long Bay', 'Zhangjiajie', 'Maldives', 'New Zealand',
  'Milford Sound', 'Mount Fuji', 'Guilin', 'Great Barrier Reef',
  // Africa
  'Sahara Desert', 'Serengeti', 'Victoria Falls', 'Namib Desert',
];

// Combined list of all destinations
export const TOP_DESTINATIONS = [...TOP_CITIES, ...TOP_NATURE_REGIONS];

export async function preGenerateAllCityImages(): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const city of TOP_DESTINATIONS) {
    try {
      await getCityImageUrl(city);
      success.push(city);
      console.log(`[Imagen] ✓ ${city}`);
    } catch (error) {
      failed.push(city);
      console.error(`[Imagen] ✗ ${city}:`, error);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success, failed };
}
