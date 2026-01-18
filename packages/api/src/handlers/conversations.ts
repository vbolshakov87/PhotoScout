import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  listConversations,
  getConversation,
  getConversationMessages,
  deleteConversation,
} from '../lib/dynamo';
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

    // GET /conversations - List all conversations
    if (path === '/api/conversations' && method === 'GET') {
      const limit = Math.min(
        Math.max(parseInt(event.queryStringParameters?.limit || '20') || 20, 1),
        100
      );
      const cursor = event.queryStringParameters?.cursor;

      const result = await listConversations(visitorId, limit, cursor);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result),
      };
    }

    // GET /conversations/:id - Get single conversation with messages
    const conversationMatch = path.match(/^\/api\/conversations\/([^/]+)$/);
    if (conversationMatch && method === 'GET') {
      const conversationId = conversationMatch[1];

      const [conversation, messages] = await Promise.all([
        getConversation(visitorId, conversationId),
        getConversationMessages(visitorId, conversationId),
      ]);

      if (!conversation) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Conversation not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ conversation, messages }),
      };
    }

    // DELETE /conversations/:id - Delete conversation
    if (conversationMatch && method === 'DELETE') {
      const conversationId = conversationMatch[1];
      await deleteConversation(visitorId, conversationId);

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
    console.error('Conversations error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
