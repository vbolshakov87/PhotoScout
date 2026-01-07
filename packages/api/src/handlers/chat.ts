import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import type { ChatRequest, Message, Plan } from '@photoscout/shared';
import {
  saveMessage,
  getRecentMessages,
  upsertConversation,
  savePlan,
  extractCityFromContent,
  countSpotsInPlan,
} from '../lib/dynamo';
import { streamChatResponse } from '../lib/anthropic';

// AWS Lambda streaming types
declare const awslambda: {
  streamifyResponse: (handler: StreamingHandler) => any;
  HttpResponseStream: {
    from(responseStream: any, metadata: any): any;
  };
};

type StreamingHandler = (
  event: APIGatewayProxyEventV2,
  responseStream: any
) => Promise<void>;

// Internal handler for actual logic
async function internalHandler(
  event: APIGatewayProxyEventV2,
  responseStream: any
): Promise<void> {
  // Handle OPTIONS
  if (event.requestContext.http.method === 'OPTIONS') {
    responseStream.write('');
    responseStream.end();
    return;
  }

  try {
    const body: ChatRequest = JSON.parse(event.body || '{}');
    const { visitorId, message, conversationId = uuidv4() } = body;

    if (!visitorId || !message) {
      responseStream.write(JSON.stringify({ error: 'Missing visitorId or message' }));
      responseStream.end();
      return;
    }

    // Get conversation history
    const history = await getRecentMessages(visitorId, 20);

    // Save user message
    const userMessage: Message = {
      id: uuidv4(),
      visitorId,
      conversationId,
      timestamp: Date.now(),
      role: 'user',
      content: message,
    };
    await saveMessage(userMessage);

    // Update conversation metadata
    const conversationTitle =
      message.length > 50 ? message.substring(0, 50) + '...' : message;
    await upsertConversation(visitorId, conversationId, conversationTitle);

    // Stream response
    let fullContent = '';

    for await (const chunk of streamChatResponse(history, message)) {
      fullContent += chunk;
      const event = `data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`;
      responseStream.write(event);
    }

    // Check if response contains HTML plan
    const isHtmlPlan = fullContent.includes('<!DOCTYPE html>');
    let savedPlanId: string | undefined;

    if (isHtmlPlan) {
      const city = extractCityFromContent(fullContent);
      const spotCount = countSpotsInPlan(fullContent);

      const plan: Plan = {
        planId: uuidv4(),
        visitorId,
        conversationId,
        createdAt: Date.now(),
        city: city || 'Unknown',
        title: city ? `${city} Photo Trip` : 'Photo Trip Plan',
        htmlContent: fullContent,
        spotCount,
      };

      await savePlan(plan);
      savedPlanId = plan.planId;

      // Update conversation with city
      if (city) {
        await upsertConversation(
          visitorId,
          conversationId,
          `${city} Trip`,
          city
        );
      }

      // Send plan saved event
      const planEvent = `data: ${JSON.stringify({
        type: 'plan_saved',
        planId: savedPlanId,
      })}\n\n`;
      responseStream.write(planEvent);
    }

    // Save assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      visitorId,
      conversationId,
      timestamp: Date.now(),
      role: 'assistant',
      content: fullContent,
      isHtml: isHtmlPlan,
      model: 'claude-sonnet-4-20250514',
    };
    await saveMessage(assistantMessage);

    // Send done event
    const doneEvent = `data: ${JSON.stringify({
      type: 'done',
      conversationId,
      messageId: assistantMessage.id,
    })}\n\n`;
    responseStream.write(doneEvent);

    responseStream.end();
  } catch (error) {
    console.error('Chat error:', error);
    responseStream.write(JSON.stringify({ error: 'Internal server error' }));
    responseStream.end();
  }
}

// Export handler with AWS Lambda response streaming
export const handler = awslambda.streamifyResponse(
  async (event: APIGatewayProxyEventV2, responseStream: any) => {
    const metadata = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };

    const wrappedStream = awslambda.HttpResponseStream.from(responseStream, metadata);
    await internalHandler(event, wrappedStream);
  }
);
