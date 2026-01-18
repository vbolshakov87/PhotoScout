import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getCityImageUrl,
  getCachedCityImages,
  preGenerateAllCityImages,
  TOP_DESTINATIONS,
  TOP_CITIES,
  TOP_NATURE_REGIONS,
} from '../lib/imagen';
import { getCorsHeaders } from '../lib/cors';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const corsHeaders = getCorsHeaders(event.headers.origin, 'GET, POST, OPTIONS');

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const path = event.rawPath;
    const method = event.requestContext.http.method;

    // GET /api/images/city/:cityName - Get or generate city image
    const cityMatch = path.match(/^\/api\/images\/city\/(.+)$/);
    if (cityMatch && method === 'GET') {
      const city = decodeURIComponent(cityMatch[1]);

      try {
        const imageUrl = await getCityImageUrl(city);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ city, imageUrl }),
        };
      } catch (error) {
        console.error(`[Images] Error generating image for ${city}:`, error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Failed to generate image', city }),
        };
      }
    }

    // POST /api/images/cities - Get cached images for multiple cities
    if (path === '/api/images/cities' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const cities = body.cities as string[];

      if (!cities || !Array.isArray(cities)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'cities array is required' }),
        };
      }

      const images = await getCachedCityImages(cities);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ images }),
      };
    }

    // GET /api/images/destinations - Get list of top destinations
    if (path === '/api/images/destinations' && method === 'GET') {
      const images = await getCachedCityImages(TOP_DESTINATIONS);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          destinations: TOP_DESTINATIONS,
          cities: TOP_CITIES,
          natureRegions: TOP_NATURE_REGIONS,
          images,
        }),
      };
    }

    // POST /api/images/generate-all - Pre-generate all city images (admin endpoint)
    if (path === '/api/images/generate-all' && method === 'POST') {
      // Verify admin API key
      const providedKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
      if (!ADMIN_API_KEY || providedKey !== ADMIN_API_KEY) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Forbidden: Invalid or missing admin key' }),
        };
      }

      const result = await preGenerateAllCityImages();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Images handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
