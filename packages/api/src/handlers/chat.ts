// Build: 2026-01-11-v3 - Add plan caching
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import type { ChatRequest, Message, Plan } from '@photoscout/shared';
import {
  saveMessage,
  getRecentMessages,
  upsertConversation,
  savePlan,
  countSpotsInPlan,
  saveCachedPlan,
  generateCacheKey,
} from '../lib/dynamo';
import { getLLMClient } from '../lib/llm-factory';
import { generateHTML, type TripPlan } from '../lib/html-template';
import { uploadHtmlToS3 } from '../lib/s3';
import { extractPlanParams, mergeParams, type PlanParams } from '../lib/plan-params';
import { getCorsOrigin } from '../lib/cors';

// AWS Lambda streaming types
declare const awslambda: {
  streamifyResponse: (handler: StreamingHandler) => any;
  HttpResponseStream: {
    from(responseStream: any, metadata: any): any;
  };
};

type StreamingHandler = (event: APIGatewayProxyEventV2, responseStream: any) => Promise<void>;

/**
 * Handle incoming chat requests: stream LLM responses to the client as SSE, detect and convert trip plans (JSON or HTML), persist messages and plans (including caching and S3 upload), and close the stream.
 *
 * Writes intermediate `delta` events during LLM streaming, may emit `html`, `plan_saved`, `done`, or `error` SSE events, and saves user/assistant messages and plan metadata to persistence layers.
 *
 * @param event - API Gateway proxy event containing a JSON body with `visitorId`, `message`, and optional `conversationId`. The handler responds to OPTIONS requests with an empty stream.
 * @param responseStream - Writable stream used to send Server-Sent Events (SSE) back to the client.
 */
async function internalHandler(event: APIGatewayProxyEventV2, responseStream: any): Promise<void> {
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
    const conversationTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;
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
    let generatedHtml: string | undefined;

    // Detect if LLM returned JSON trip plan
    if (
      fullContent.trim().startsWith('{') &&
      fullContent.includes('"title"') &&
      fullContent.includes('"spots"')
    ) {
      console.log('[Chat] Detected JSON trip plan, converting to HTML...');

      try {
        // Try to extract just the JSON if there's surrounding text
        let jsonToParse = fullContent.trim();

        // If content doesn't start with {, try to find JSON block
        if (!jsonToParse.startsWith('{')) {
          const jsonStart = jsonToParse.indexOf('{');
          const jsonEnd = jsonToParse.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonToParse = jsonToParse.substring(jsonStart, jsonEnd + 1);
            console.log('[Chat] Extracted JSON from surrounding text');
          }
        }

        // Parse JSON and generate HTML
        const tripPlan: TripPlan = JSON.parse(jsonToParse);
        generatedHtml = generateHTML(tripPlan);
        isHtmlPlan = true;

        console.log('[Chat] Successfully converted JSON to HTML', {
          jsonLength: fullContent.length,
          htmlLength: generatedHtml.length,
        });

        // Stream the HTML to client
        const htmlEvent = `data: ${JSON.stringify({ type: 'html', content: generatedHtml })}\n\n`;
        responseStream.write(htmlEvent);
      } catch (parseError) {
        console.error('[Chat] Failed to parse JSON trip plan:', parseError);
        console.error(
          '[Chat] Content that failed to parse (first 500 chars):',
          fullContent.substring(0, 500)
        );

        // Send error event to client so they know what happened
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Failed to generate trip plan. Please try again.',
        })}\n\n`;
        responseStream.write(errorEvent);
      }
    } else {
      // Check if response contains HTML plan (legacy support)
      isHtmlPlan = fullContent.includes('<!DOCTYPE html>');
      if (isHtmlPlan) {
        generatedHtml = fullContent;
      }
    }

    if (isHtmlPlan && generatedHtml) {
      let planCity = 'Unknown';
      let planTitle = 'Photo Trip Plan';
      let planDates: string | undefined;
      let spotCount = 0;
      let jsonContent: string | undefined;
      let planInterests = '';
      let planDuration = '';

      try {
        // Find JSON block even if there's surrounding text
        const jsonMatch = fullContent.match(/\{[\s\S]*"title"[\s\S]*"spots"[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0]; // Store the raw JSON string
          const tripPlan: TripPlan = JSON.parse(jsonContent);

          // Extract fields directly from JSON
          if (tripPlan.city) planCity = tripPlan.city;
          if (tripPlan.title) planTitle = tripPlan.title;
          if (tripPlan.dates) planDates = tripPlan.dates;
          if (tripPlan.spots) spotCount = tripPlan.spots.length;

          // Extract interests and duration from conversation for caching
          const allMessages = [...history, { content: message }];
          let params: PlanParams = { city: null, interests: null, duration: null };
          for (const msg of allMessages) {
            if (msg.content) {
              params = mergeParams(params, extractPlanParams(msg.content));
            }
          }

          // Use extracted or fallback values
          planInterests = params.interests || tripPlan.spots?.[0]?.tags?.join('-') || 'general';
          planDuration =
            params.duration || String(Math.max(...(tripPlan.spots?.map((s) => s.day ?? 1) || [1])));

          // Save to cache for future requests
          const cacheKey = generateCacheKey(planCity, planInterests, planDuration);
          console.log('[Cache] Saving plan to cache:', {
            cacheKey,
            city: planCity,
            interests: planInterests,
            duration: planDuration,
          });

          await saveCachedPlan(
            cacheKey,
            planCity,
            planInterests,
            planDuration,
            jsonContent,
            generatedHtml
          );
        } else {
          // Fallback: count spots from HTML if JSON not found
          console.warn('[Chat] JSON not found in response, using HTML fallback');
          spotCount = countSpotsInPlan(generatedHtml);
        }
      } catch (e) {
        console.error('[Chat] Error extracting metadata from JSON:', e);
        // Fallback: count spots from HTML
        spotCount = countSpotsInPlan(generatedHtml);
      }

      const planId = uuidv4();

      // Upload HTML to S3
      console.log('[Chat] Uploading HTML to S3...', { planId, htmlLength: generatedHtml.length });
      const htmlUrl = await uploadHtmlToS3(visitorId, planId, generatedHtml);
      console.log('[Chat] HTML uploaded to S3:', { htmlUrl });

      const plan: Plan = {
        planId,
        visitorId,
        conversationId,
        createdAt: Date.now(),
        destination: planCity, // Primary field for destination name
        city: planCity, // Deprecated - kept for backwards compatibility
        title: planTitle,
        dates: planDates,
        htmlUrl, // CloudFront URL
        jsonContent, // Store the JSON for future regeneration
        spotCount,
      };

      await savePlan(plan);
      savedPlanId = plan.planId;

      // Update conversation with city
      if (planCity && planCity !== 'Unknown') {
        await upsertConversation(visitorId, conversationId, `${planCity} Trip`, planCity);
      }

      // Send plan saved event
      const planEvent = `data: ${JSON.stringify({
        type: 'plan_saved',
        planId: savedPlanId,
      })}\n\n`;
      responseStream.write(planEvent);
    }

    // Save assistant message (save original JSON, not HTML)
    const assistantMessage: Message = {
      id: uuidv4(),
      visitorId,
      conversationId,
      timestamp: Date.now(),
      role: 'assistant',
      content: fullContent, // Save the original JSON content
      isHtml: isHtmlPlan,
      model:
        process.env.CLAUDE_MODEL === 'sonnet'
          ? 'claude-sonnet-4-5-20250929'
          : 'claude-haiku-4-5-20251001',
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
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': getCorsOrigin(event.headers.origin),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    };

    const wrappedStream = awslambda.HttpResponseStream.from(responseStream, metadata);
    await internalHandler(event, wrappedStream);
  }
);
