import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getCityImageUrl, getCachedCityImages, preGenerateAllCityImages, TOP_DESTINATIONS, TOP_CITIES, TOP_NATURE_REGIONS } from '../lib/imagen';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
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
      // This should be protected in production
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
