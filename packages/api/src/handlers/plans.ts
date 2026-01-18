import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { listPlans, getPlan, deletePlan } from '../lib/dynamo';
import { downloadHtmlFromS3 } from '../lib/s3';
import { getCorsHeaders } from '../lib/cors';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const corsHeaders = getCorsHeaders(event.headers.origin, 'GET, DELETE, OPTIONS');

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const visitorId = event.queryStringParameters?.visitorId;

    if (!visitorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing visitorId' }),
      };
    }

    const path = event.rawPath;
    const method = event.requestContext.http.method;

    // GET /plans - List all plans (without HTML content)
    if (path === '/api/plans' && method === 'GET') {
      const limit = Math.min(
        Math.max(parseInt(event.queryStringParameters?.limit || '20') || 20, 1),
        100
      );
      const cursor = event.queryStringParameters?.cursor;

      const result = await listPlans(visitorId, limit, cursor);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result),
      };
    }

    // GET /plans/:id - Get single plan with HTML content
    const planMatch = path.match(/^\/api\/plans\/([^/]+)$/);
    if (planMatch && method === 'GET') {
      const planId = planMatch[1];
      const plan = await getPlan(visitorId, planId);

      if (!plan) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Plan not found' }),
        };
      }

      // Try to get HTML from S3 first
      let htmlContent = await downloadHtmlFromS3(visitorId, planId);

      // Fallback to DynamoDB if S3 fails
      if (!htmlContent && plan.htmlContent) {
        htmlContent = plan.htmlContent;
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ...plan,
          htmlContent,
        }),
      };
    }

    // GET /plans/:id/html - Get just the HTML (for iframe embedding)
    const planHtmlMatch = path.match(/^\/api\/plans\/([^/]+)\/html$/);
    if (planHtmlMatch && method === 'GET') {
      const planId = planHtmlMatch[1];
      const plan = await getPlan(visitorId, planId);

      if (!plan) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'text/html' },
          body: '<html><body>Plan not found</body></html>',
        };
      }

      // Try to get HTML from S3 first
      let htmlContent = await downloadHtmlFromS3(visitorId, planId);

      // Fallback to DynamoDB if S3 fails
      if (!htmlContent && plan.htmlContent) {
        htmlContent = plan.htmlContent;
      }

      if (!htmlContent) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'text/html' },
          body: '<html><body>Plan content not found</body></html>',
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
        },
        body: htmlContent,
      };
    }

    // DELETE /plans/:id - Delete plan
    if (planMatch && method === 'DELETE') {
      const planId = planMatch[1];
      await deletePlan(visitorId, planId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Plans error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
