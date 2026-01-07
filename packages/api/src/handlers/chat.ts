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
import { getLLMClient } from '../lib/llm-factory';
import { generateHTML, type TripPlan } from '../lib/html-template';
import { uploadHtmlToS3 } from '../lib/s3';

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
    const llmClient = getLLMClient();

    console.log('[Chat] Starting LLM streaming...', { historyLength: history.length });

    try {
      for await (const chunk of llmClient.streamChatResponse(history, message)) {
        fullContent += chunk;
        const event = `data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`;
        responseStream.write(event);
      }
      console.log('[Chat] LLM streaming completed', { contentLength: fullContent.length });
    } catch (streamError) {
      console.error('[Chat] LLM streaming error:', streamError);
      throw streamError; // Re-throw to be caught by outer catch block
    }

    // Check if response is JSON trip plan
    let isHtmlPlan = false;
    let savedPlanId: string | undefined;
    let finalContent = fullContent;

    // Detect if LLM returned JSON trip plan
    if (fullContent.trim().startsWith('{') && fullContent.includes('"title"') && fullContent.includes('"spots"')) {
      console.log('[Chat] Detected JSON trip plan, converting to HTML...');

      try {
        // Parse JSON and generate HTML
        const tripPlan: TripPlan = JSON.parse(fullContent);
        const htmlContent = generateHTML(tripPlan);

        // Replace fullContent with HTML for storage and client
        finalContent = htmlContent;
        isHtmlPlan = true;

        console.log('[Chat] Successfully converted JSON to HTML', {
          jsonLength: fullContent.length,
          htmlLength: htmlContent.length
        });

        // Stream the HTML to client
        const htmlEvent = `data: ${JSON.stringify({ type: 'html', content: htmlContent })}\n\n`;
        responseStream.write(htmlEvent);
      } catch (parseError) {
        console.error('[Chat] Failed to parse JSON trip plan:', parseError);
        // Keep original content if JSON parsing fails
      }
    } else {
      // Check if response contains HTML plan (legacy support)
      isHtmlPlan = fullContent.includes('<!DOCTYPE html>');
    }

    if (isHtmlPlan) {
      const city = extractCityFromContent(finalContent);
      const spotCount = countSpotsInPlan(finalContent);

      const planId = uuidv4();

      // Upload HTML to S3
      console.log('[Chat] Uploading HTML to S3...', { planId, htmlLength: finalContent.length });
      const htmlUrl = await uploadHtmlToS3(visitorId, planId, finalContent);
      console.log('[Chat] HTML uploaded to S3:', { htmlUrl });

      const plan: Plan = {
        planId,
        visitorId,
        conversationId,
        createdAt: Date.now(),
        city: city || 'Unknown',
        title: city ? `${city} Photo Trip` : 'Photo Trip Plan',
        htmlUrl, // CloudFront URL
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
      content: finalContent,
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    // Send error in SSE format
    const errorEvent = `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`;
    responseStream.write(errorEvent);
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
