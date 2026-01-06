import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Message, Conversation, Plan, PaginatedResponse } from '@photoscout/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'photoscout-messages';
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'photoscout-conversations';
const PLANS_TABLE = process.env.PLANS_TABLE || 'photoscout-plans';

const TTL_DAYS = 90;

function getTTL(): number {
  return Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;
}

// ============ MESSAGES ============

export async function saveMessage(message: Message): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: {
        visitorId: message.visitorId,
        timestamp: message.timestamp,
        messageId: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        isHtml: message.isHtml || false,
        model: message.model,
        tokenCount: message.tokenCount,
        city: message.city,
        expiresAt: getTTL(),
      },
    })
  );
}

export async function getConversationMessages(
  visitorId: string,
  conversationId: string
): Promise<Message[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: MESSAGES_TABLE,
      IndexName: 'conversationId-index',
      KeyConditionExpression: 'conversationId = :cid',
      FilterExpression: 'visitorId = :vid',
      ExpressionAttributeValues: {
        ':cid': conversationId,
        ':vid': visitorId,
      },
      ScanIndexForward: true,
    })
  );

  return (result.Items || []) as Message[];
}

export async function getRecentMessages(
  visitorId: string,
  limit: number = 20
): Promise<Message[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'visitorId = :vid',
      ExpressionAttributeValues: {
        ':vid': visitorId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items || []).reverse() as Message[];
}

// ============ CONVERSATIONS ============

export async function upsertConversation(
  visitorId: string,
  conversationId: string,
  title: string,
  city?: string
): Promise<void> {
  const now = Date.now();

  await docClient.send(
    new UpdateCommand({
      TableName: CONVERSATIONS_TABLE,
      Key: {
        visitorId,
        conversationId,
      },
      UpdateExpression: `
        SET updatedAt = :now,
            title = :title,
            messageCount = if_not_exists(messageCount, :zero) + :one,
            expiresAt = :ttl
            ${city ? ', city = :city, createdAt = if_not_exists(createdAt, :now)' : ', createdAt = if_not_exists(createdAt, :now)'}
      `,
      ExpressionAttributeValues: {
        ':now': now,
        ':title': title,
        ':zero': 0,
        ':one': 1,
        ':ttl': getTTL(),
        ...(city && { ':city': city }),
      },
    })
  );
}

export async function listConversations(
  visitorId: string,
  limit: number = 20,
  cursor?: string
): Promise<PaginatedResponse<Conversation>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: CONVERSATIONS_TABLE,
      KeyConditionExpression: 'visitorId = :vid',
      ExpressionAttributeValues: {
        ':vid': visitorId,
      },
      ScanIndexForward: false,
      Limit: limit,
      ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
    })
  );

  const items = (result.Items || []) as Conversation[];
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    items,
    nextCursor,
    hasMore: !!result.LastEvaluatedKey,
  };
}

export async function getConversation(
  visitorId: string,
  conversationId: string
): Promise<Conversation | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONVERSATIONS_TABLE,
      Key: {
        visitorId,
        conversationId,
      },
    })
  );

  return (result.Item as Conversation) || null;
}

export async function deleteConversation(
  visitorId: string,
  conversationId: string
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: CONVERSATIONS_TABLE,
      Key: {
        visitorId,
        conversationId,
      },
    })
  );
}

// ============ PLANS ============

export async function savePlan(plan: Plan): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: PLANS_TABLE,
      Item: {
        visitorId: plan.visitorId,
        planId: plan.planId,
        conversationId: plan.conversationId,
        createdAt: plan.createdAt,
        city: plan.city,
        title: plan.title,
        htmlContent: plan.htmlContent,
        spotCount: plan.spotCount,
        expiresAt: getTTL(),
      },
    })
  );
}

export async function listPlans(
  visitorId: string,
  limit: number = 20,
  cursor?: string
): Promise<PaginatedResponse<Omit<Plan, 'htmlContent'>>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: PLANS_TABLE,
      KeyConditionExpression: 'visitorId = :vid',
      ExpressionAttributeValues: {
        ':vid': visitorId,
      },
      ProjectionExpression: 'planId, visitorId, conversationId, createdAt, city, title, spotCount',
      ScanIndexForward: false,
      Limit: limit,
      ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
    })
  );

  const items = (result.Items || []) as Omit<Plan, 'htmlContent'>[];
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    items,
    nextCursor,
    hasMore: !!result.LastEvaluatedKey,
  };
}

export async function getPlan(
  visitorId: string,
  planId: string
): Promise<Plan | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PLANS_TABLE,
      Key: {
        visitorId,
        planId,
      },
    })
  );

  return (result.Item as Plan) || null;
}

export async function deletePlan(
  visitorId: string,
  planId: string
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: PLANS_TABLE,
      Key: {
        visitorId,
        planId,
      },
    })
  );
}

// ============ HELPERS ============

export function extractCityFromContent(content: string): string | undefined {
  // Try to extract city from HTML title
  const titleMatch = content.match(/<title>([^<]+)/i);
  if (titleMatch) {
    const title = titleMatch[1];
    // Common patterns: "Hamburg Photo Spots", "Tokyo Photography Guide"
    const cityMatch = title.match(/^(\w+(?:\s+\w+)?)\s+(?:Photo|Photography)/i);
    if (cityMatch) return cityMatch[1];
  }
  return undefined;
}

export function countSpotsInPlan(htmlContent: string): number {
  // Count spot cards in the HTML
  const spotMatches = htmlContent.match(/spot-card/g);
  return spotMatches ? spotMatches.length : 0;
}
