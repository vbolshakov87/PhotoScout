import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
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

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // CORS headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body: ChatRequest = JSON.parse(event.body || '{}');
    const { visitorId, message, conversationId = uuidv4() } = body;

    if (!visitorId || !message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing visitorId or message' }),
      };
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
    const conversationTitle = message.length > 50
      ? message.substring(0, 50) + '...'
      : message;
    await upsertConversation(visitorId, conversationId, conversationTitle);

    // Stream response
    let fullContent = '';
    const chunks: string[] = [];

    for await (const chunk of streamChatResponse(history, message)) {
      fullContent += chunk;
      chunks.push(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
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
        await upsertConversation(visitorId, conversationId, `${city} Trip`, city);
      }
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

    // Add done event
    const doneEvent: Record<string, unknown> = {
      type: 'done',
      conversationId,
      messageId: assistantMessage.id,
    };

    if (savedPlanId) {
      doneEvent.planId = savedPlanId;
      chunks.push(`data: ${JSON.stringify({ type: 'plan_saved', planId: savedPlanId })}\n\n`);
    }

    chunks.push(`data: ${JSON.stringify(doneEvent)}\n\n`);

    return {
      statusCode: 200,
      headers,
      body: chunks.join(''),
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
