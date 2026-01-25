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
// Fetching timeout - treat as stale after 1 minute (Lambda could have crashed)
const FETCHING_TIMEOUT_MS = 60 * 1000;

// Status for in-progress fetches to prevent race conditions
type DestinationStatus = 'ready' | 'fetching' | 'failed';

interface DestinationRecord extends DestinationImage {
  status: DestinationStatus;
  errorMessage?: string;
  updatedAt: number;
}

/**
 * Validate a destination identifier.
 *
 * @param destinationId - The destination identifier (slug) to validate
 * @returns `null` if the identifier is valid, otherwise an error message describing the validation failure
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
 * Enforces a simple per-client request rate limit.
 *
 * @param clientId - Identifier for the client used to track request counts
 * @returns `true` if the request is allowed under the current rate limit, `false` otherwise
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
 * Retrieve a destination image URL, using a cached ready record when available and fetching from the image provider on cache miss.
 *
 * @param destinationId - The canonical ID of the destination to look up or fetch
 * @param destinationName - The human-readable name used by the image provider when fetching
 * @param type - The image type/category (`city` or `nature`), defaults to `city`
 * @param region - Optional region hint for provider selection or S3 key placement
 * @returns An object containing:
 *  - `imageUrl` — The CloudFront URL for the fetched or cached image, or a placeholder URL on failure
 *  - `destination` — The persisted DestinationImage when available, or `null` when a placeholder is returned
 *  - `fromCache` — `true` if the URL came from an existing ready record, `false` otherwise
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
        // Check if the fetch is stale (Lambda may have crashed)
        const isStale = Date.now() - existing.updatedAt > FETCHING_TIMEOUT_MS;
        if (isStale) {
          console.log(`[Destinations] Fetch stale, retrying: ${destinationId}`);
          break; // Break out to re-fetch
        }

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
  const lockAcquired = await markAsFetching(destinationId);
  if (!lockAcquired) {
    // Another request acquired the lock, return placeholder instead of duplicate fetch
    console.log(`[Destinations] Lock not acquired, returning placeholder: ${destinationId}`);
    return { imageUrl: getPlaceholderUrl(type), destination: null, fromCache: false };
  }

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
 * Retrieve a destination record by ID from DynamoDB and apply backward-compatible mapping for legacy records.
 *
 * If an item contains an older `unsplash` field but lacks `source`, the function copies relevant `unsplash` data into `source` before returning.
 *
 * @returns The destination record for `destinationId`, or `null` if no record exists.
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
 * Mark the destination record as in-progress so other processes know a fetch is underway.
 *
 * Attempts to set the destination's status to `'fetching'` with an updated timestamp; if the record is already marked `'fetching'`, the function returns `false` to indicate the lock was not acquired.
 *
 * @param destinationId - The slug or identifier of the destination to mark as fetching
 * @returns `true` if the lock was acquired, `false` if another request is already fetching
 */
async function markAsFetching(destinationId: string): Promise<boolean> {
  try {
    await docClient.send(
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
    );
    return true; // Lock acquired
  } catch (error) {
    // ConditionalCheckFailedException means another request is already fetching
    if ((error as Error).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Record that a destination fetch has failed by persisting failure details.
 *
 * Writes or updates the destination record with status `failed`, stores the provided `errorMessage`, and sets `updatedAt` to the current timestamp.
 *
 * @param destinationId - The destination's identifier (primary key) to mark as failed
 * @param errorMessage - A human-readable error message or diagnostic information to store with the record
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
 * Fetches an image from the configured image provider, uploads the image to S3,
 * and saves a ready destination record to DynamoDB.
 *
 * @param destinationId - Identifier used for the S3 object key and DynamoDB item key
 * @param destinationName - Human-readable name to request from the image provider
 * @param type - Image category, either `'city'` or `'nature'`
 * @param region - Optional region used for provider lookup and included in the S3 key when present
 * @returns The persisted DestinationImage containing S3 metadata, photographer and source details, and `fetchedAt` timestamp
 * @throws Error if no image provider is configured
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
 * Constructs the CloudFront URL for a given S3 object key.
 *
 * @param s3Key - The S3 object key path used by CloudFront (e.g. `destinations/type/[region/]id.jpg`)
 * @returns The full CloudFront URL for the specified `s3Key`
 */
function getCloudFrontUrl(s3Key: string): string {
  return `https://aiscout.photo/${s3Key}`;
}

/**
 * Selects the configured placeholder image URL for the given destination type.
 *
 * @param type - Use `'city'` to get the city placeholder, `'nature'` to get the nature placeholder
 * @returns The absolute URL of the placeholder image
 */
function getPlaceholderUrl(type: 'city' | 'nature'): string {
  return type === 'city'
    ? `https://aiscout.photo${PLACEHOLDER_CITY}`
    : `https://aiscout.photo${PLACEHOLDER_NATURE}`;
}

/**
 * Creates a URL-friendly destination identifier from a name.
 *
 * Converts the input to lowercase, replaces runs of whitespace with hyphens,
 * removes characters other than lowercase letters, digits, and hyphens,
 * and truncates the result to the maximum allowed destination ID length.
 *
 * @param name - The original destination name to convert
 * @returns The resulting slug suitable for use as a destination ID
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, MAX_DESTINATION_ID_LENGTH);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
