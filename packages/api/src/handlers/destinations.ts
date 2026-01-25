import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getDestinationImage,
  slugify,
  validateDestinationId,
  checkRateLimit,
} from '../lib/destinations';
import { getCorsHeaders } from '../lib/cors';

/**
 * Handle GET /api/destinations/:id requests, applying CORS, per-IP rate limiting, destination id validation, and returning a destination image payload.
 *
 * @param event - The incoming API Gateway HTTP event
 * @returns An HTTP response with CORS headers. Possible responses:
 * - 200: JSON body with `{ id, name, imageUrl, photographer, source, fromCache }` for a found destination
 * - 400: JSON body `{ error }` for validation errors
 * - 404: JSON body `{ error: 'Not found' }` when the path does not match
 * - 429: JSON body `{ error: 'Too many requests' }` when the client is rate-limited (includes `Retry-After` header)
 * - 500: JSON body `{ error: 'Internal server error' }` for unexpected failures
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const corsHeaders = getCorsHeaders(event.headers.origin, 'GET, OPTIONS');

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Rate limiting - use client IP as identifier
    const clientIp = event.requestContext.http.sourceIp || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60',
        },
        body: JSON.stringify({ error: 'Too many requests' }),
      };
    }

    const path = event.rawPath;

    // GET /api/destinations/:id - Get destination image (lazy-loads from provider)
    const match = path.match(/^\/api\/destinations\/([^/]+)$/);
    if (match) {
      const rawId = decodeURIComponent(match[1]);
      const destinationId = slugify(rawId);

      // Validate destination ID
      const validationError = validateDestinationId(destinationId);
      if (validationError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: validationError }),
        };
      }

      // Convert slug to display name (e.g., "new-york" -> "New York")
      const name = rawId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      // Default to 'city' type - nature destinations will still work
      const {
        imageUrl,
        destination: destData,
        fromCache,
      } = await getDestinationImage(destinationId, name, 'city');

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': fromCache ? 'public, max-age=86400' : 'no-cache',
        },
        body: JSON.stringify({
          id: destinationId,
          name,
          imageUrl,
          photographer: destData?.photographer,
          source: destData?.source,
          fromCache,
        }),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Destinations error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}