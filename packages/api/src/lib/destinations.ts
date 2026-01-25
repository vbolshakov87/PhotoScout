import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { DestinationImage } from '@photoscout/shared';
import { getImageProvider } from './image-providers';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const DESTINATIONS_TABLE = process.env.DESTINATIONS_TABLE || 'photoscout-destinations';
const IMAGES_BUCKET = process.env.IMAGES_BUCKET || 'photoscout-images';

// Configurable placeholder images (can be overridden via env vars)
const PLACEHOLDER_CITY = process.env.PLACEHOLDER_CITY_URL || '/images/placeholders/city.jpg';
const PLACEHOLDER_NATURE = process.env.PLACEHOLDER_NATURE_URL || '/images/placeholders/nature.jpg';

// Rate limiting: max requests per minute per IP (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Validation constants
const MAX_DESTINATION_ID_LENGTH = 100;
const VALID_DESTINATION_ID_PATTERN = /^[a-z0-9-]+$/;

// Max retries for fetching status
const MAX_FETCH_RETRIES = 5;
const FETCH_RETRY_DELAY = 2000;

// Status for in-progress fetches to prevent race conditions
type DestinationStatus = 'ready' | 'fetching' | 'failed';

interface DestinationRecord extends DestinationImage {
  status: DestinationStatus;
  errorMessage?: string;
  updatedAt: number;
}

/**
 * Validate destination ID
 * Returns error message if invalid, null if valid
 */
export function validateDestinationId(destinationId: string): string | null {
  if (!destinationId) {
    return 'Destination ID is required';
  }
  if (destinationId.length > MAX_DESTINATION_ID_LENGTH) {
    return 'Destination ID is too long';
  }
  if (!VALID_DESTINATION_ID_PATTERN.test(destinationId)) {
    return 'Invalid destination ID format';
  }
  return null;
}

/**
 * Simple rate limiting check
 * Returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get a destination image by ID
 * Returns the CloudFront URL if available, or fetches from provider if not
 */
export async function getDestinationImage(
  destinationId: string,
  destinationName: string,
  type: 'city' | 'nature' = 'city',
  region?: string
): Promise<{ imageUrl: string; destination: DestinationImage | null; fromCache: boolean }> {
  // 1. Check DynamoDB for existing destination (with retry for 'fetching' status)
  let retries = 0;
  while (retries < MAX_FETCH_RETRIES) {
    const existing = await getDestination(destinationId);

    if (existing) {
      if (existing.status === 'ready') {
        console.log(`[Destinations] Cache HIT: ${destinationId}`);
        return {
          imageUrl: getCloudFrontUrl(existing.s3Key),
          destination: existing,
          fromCache: true,
        };
      }

      if (existing.status === 'fetching') {
        // Another request is fetching, wait and retry (with max retries)
        console.log(
          `[Destinations] Fetch in progress, retry ${retries + 1}/${MAX_FETCH_RETRIES}: ${destinationId}`
        );
        retries++;
        if (retries < MAX_FETCH_RETRIES) {
          await sleep(FETCH_RETRY_DELAY);
          continue;
        }
        // Max retries reached, return placeholder
        console.log(`[Destinations] Max retries reached, returning placeholder: ${destinationId}`);
        return { imageUrl: getPlaceholderUrl(type), destination: null, fromCache: false };
      }

      if (existing.status === 'failed') {
        // Check if we should retry (after 1 hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (existing.updatedAt > oneHourAgo) {
          console.log(`[Destinations] Recently failed, returning placeholder: ${destinationId}`);
          return { imageUrl: getPlaceholderUrl(type), destination: null, fromCache: false };
        }
        // Retry after 1 hour - break out of loop to fetch
        break;
      }
    }

    // No existing record, break out to fetch
    break;
  }

  // 2. Mark as fetching to prevent race conditions
  await markAsFetching(destinationId);

  // 3. Fetch from image provider
  console.log(`[Destinations] Cache MISS, fetching: ${destinationId}`);
  try {
    const destination = await fetchFromProvider(destinationId, destinationName, type, region);
    return {
      imageUrl: getCloudFrontUrl(destination.s3Key),
      destination,
      fromCache: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Destinations] Fetch failed: ${destinationId}`, message);
    await markAsFailed(destinationId, message);
    return { imageUrl: getPlaceholderUrl(type), destination: null, fromCache: false };
  }
}

/**
 * Get destination from DynamoDB
 * Handles backward compatibility for old records with 'unsplash' field
 */
async function getDestination(destinationId: string): Promise<DestinationRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: DESTINATIONS_TABLE,
      Key: { destinationId },
    })
  );

  if (!result.Item) return null;

  // Backward compatibility: map old 'unsplash' field to 'source'
  const item = result.Item as DestinationRecord & {
    unsplash?: { photoId: string; photoUrl: string };
  };
  if (!item.source && item.unsplash) {
    item.source = {
      provider: 'unsplash',
      photoId: item.unsplash.photoId,
      photoUrl: item.unsplash.photoUrl,
    };
  }

  return item as DestinationRecord;
}

/**
 * Mark destination as currently being fetched
 */
async function markAsFetching(destinationId: string): Promise<void> {
  await docClient
    .send(
      new PutCommand({
        TableName: DESTINATIONS_TABLE,
        Item: {
          destinationId,
          status: 'fetching',
          updatedAt: Date.now(),
        },
        ConditionExpression: 'attribute_not_exists(destinationId) OR #status <> :fetching',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':fetching': 'fetching' },
      })
    )
    .catch(() => {
      // Ignore condition check failure - another request is already fetching
    });
}

/**
 * Mark destination as failed
 */
async function markAsFailed(destinationId: string, errorMessage: string): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: DESTINATIONS_TABLE,
      Item: {
        destinationId,
        status: 'failed',
        errorMessage,
        updatedAt: Date.now(),
      },
    })
  );
}

/**
 * Fetch image from provider, upload to S3, save to DynamoDB
 */
async function fetchFromProvider(
  destinationId: string,
  destinationName: string,
  type: 'city' | 'nature',
  region?: string
): Promise<DestinationImage> {
  const provider = getImageProvider();
  if (!provider) {
    throw new Error('Service temporarily unavailable');
  }

  console.log(`[Destinations] Using provider: ${provider.name}`);

  // Fetch image from provider
  const result = await provider.fetchImage(destinationName, type, region);

  // Upload to S3 (served via CloudFront /destinations/* behavior)
  const s3Key = `destinations/${type}/${region ? region + '/' : ''}${destinationId}.jpg`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: IMAGES_BUCKET,
      Key: s3Key,
      Body: result.imageBuffer,
      ContentType: result.contentType,
      CacheControl: 'max-age=31536000', // 1 year
    })
  );

  // Build destination record with generic source field
  const destination: DestinationImage = {
    id: destinationId,
    name: destinationName,
    type,
    region,
    s3Key,
    s3Url: `https://${IMAGES_BUCKET}.s3.amazonaws.com/${s3Key}`,
    photographer: result.photographer,
    source: {
      provider: result.source.provider,
      photoId: result.source.photoId,
      photoUrl: result.source.photoUrl,
    },
    fetchedAt: new Date().toISOString(),
  };

  // Save to DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: DESTINATIONS_TABLE,
      Item: {
        destinationId,
        ...destination,
        status: 'ready',
        updatedAt: Date.now(),
      },
    })
  );

  console.log(`[Destinations] Saved: ${destinationId} - Photo by ${destination.photographer.name}`);
  return destination;
}

/**
 * Get CloudFront URL for an S3 key
 * S3 key matches CloudFront path: /destinations/type/[region/]id.jpg
 */
function getCloudFrontUrl(s3Key: string): string {
  return `https://aiscout.photo/${s3Key}`;
}

/**
 * Get placeholder image URL for missing destinations
 */
function getPlaceholderUrl(type: 'city' | 'nature'): string {
  return type === 'city'
    ? `https://aiscout.photo${PLACEHOLDER_CITY}`
    : `https://aiscout.photo${PLACEHOLDER_NATURE}`;
}

/**
 * Slugify a destination name to create an ID
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, MAX_DESTINATION_ID_LENGTH);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
