import { OAuth2Client } from 'google-auth-library';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '@photoscout/shared';
import { encrypt } from './encryption';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Google OAuth client
const googleClient = new OAuth2Client();

/**
 * Verify Google ID token and extract user information
 * @param idToken - Google ID token from client
 * @returns User information from Google
 */
export async function verifyGoogleToken(idToken: string): Promise<{
  userId: string;
  email: string;
  name: string;
  picture?: string;
}> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      // Note: In production, you should specify your Google Client ID here
      // audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.sub, // Google's unique user ID
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture,
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get or create user in database
 * @param googleUser - User info from Google
 * @param refreshToken - Optional refresh token to encrypt and store
 * @returns User object
 */
export async function getOrCreateUser(
  googleUser: {
    userId: string;
    email: string;
    name: string;
    picture?: string;
  },
  refreshToken?: string
): Promise<User> {
  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    throw new Error('USERS_TABLE environment variable is not set');
  }

  // Try to get existing user
  const getResult = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { userId: googleUser.userId },
    })
  );

  const now = Date.now();

  if (getResult.Item) {
    // Update existing user
    const user: User = {
      ...getResult.Item as User,
      name: googleUser.name,
      profilePicture: googleUser.picture,
      lastLoginAt: now,
    };

    // Update refresh token if provided
    if (refreshToken) {
      user.encryptedRefreshToken = encrypt(refreshToken);
    }

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: user,
      })
    );

    return user;
  }

  // Create new user
  const user: User = {
    userId: googleUser.userId,
    email: googleUser.email,
    name: googleUser.name,
    profilePicture: googleUser.picture,
    encryptedRefreshToken: refreshToken ? encrypt(refreshToken) : undefined,
    createdAt: now,
    lastLoginAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: user,
    })
  );

  return user;
}

/**
 * Extract and verify authorization token from request headers
 * @param headers - Request headers
 * @returns User ID if valid, throws error if invalid
 */
export async function authenticateRequest(headers: Record<string, string | undefined>): Promise<string> {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader) {
    throw new Error('Authorization header is missing');
  }

  // Expected format: "Bearer <id_token>"
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new Error('Invalid authorization header format');
  }

  // Verify token and extract user ID
  const googleUser = await verifyGoogleToken(token);

  // Update user record (or create if first time)
  await getOrCreateUser(googleUser);

  return googleUser.userId;
}
