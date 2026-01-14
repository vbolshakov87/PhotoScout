# PhotoScout API Documentation

RESTful API for photo trip planning, built with AWS Lambda and served via CloudFront.

## Base URL

All API requests are made to:
```
https://aiscout.photo/api
```

For development or custom deployments, replace with your CloudFront domain from `cdk-outputs.json`.

## Authentication

### Visitor ID

All requests require a `visitorId` parameter (query string or request body):

- **Authenticated Users**: Google user ID (`sub` claim from JWT)
- **Anonymous Users**: Device-generated UUID

The iOS app automatically manages visitor IDs via `AuthenticationService`.

### CORS

CORS is configured to allow all origins (`*`) for development. Update for production:

```typescript
// infra/lib/photoscout-stack.ts
cors: {
  allowedOrigins: ['https://yourdomain.com'],
  allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST, lambda.HttpMethod.DELETE],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

## Endpoints

### Chat

#### Stream AI Response

```http
POST /api/chat
Content-Type: application/json

{
  "visitorId": "string",
  "conversationId": "string",  // Optional, creates new if not provided
  "message": "string"
}
```

**Response:** Server-Sent Events (SSE) stream

```
event: token
data: {"type":"text","text":"Hello"}

event: token
data: {"type":"text","text":" world"}

event: plan
data: {"planId":"abc123","htmlUrl":"https://..."}

event: done
data: {}
```

**Event Types:**
- `token` - Text chunk from AI
- `plan` - Photo trip plan generated
- `done` - Stream complete
- `error` - Error occurred

**Example:**
```bash
curl -N 'https://aiscout.photo/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "visitorId": "test-user-123",
    "message": "Plan a photo trip to Paris"
  }'
```

### Conversations

#### List Conversations

```http
GET /api/conversations?visitorId=string&limit=20&cursor=string
```

**Parameters:**
- `visitorId` (required) - User identifier
- `limit` (optional) - Max results (default: 20)
- `cursor` (optional) - Pagination cursor

**Response:**
```json
{
  "conversations": [
    {
      "conversationId": "abc123",
      "visitorId": "user-123",
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "messageCount": 5,
      "lastMessage": "Planning trip to Paris",
      "expiresAt": 1234567890
    }
  ],
  "cursor": "next-page-token"
}
```

#### Get Conversation

```http
GET /api/conversations/:conversationId?visitorId=string
```

**Response:**
```json
{
  "conversation": {
    "conversationId": "abc123",
    "visitorId": "user-123",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  },
  "messages": [
    {
      "timestamp": 1234567890,
      "role": "user",
      "content": "Plan a photo trip to Paris"
    },
    {
      "timestamp": 1234567891,
      "role": "assistant",
      "content": "I'll help you plan...",
      "planId": "plan-123"
    }
  ]
}
```

#### Delete Conversation

```http
DELETE /api/conversations/:conversationId?visitorId=string
```

**Response:**
```json
{
  "success": true
}
```

### Plans

#### List Plans

```http
GET /api/plans?visitorId=string&limit=20&cursor=string
```

**Parameters:**
- `visitorId` (required) - User identifier
- `limit` (optional) - Max results (default: 20)
- `cursor` (optional) - Pagination cursor

**Response:**
```json
{
  "plans": [
    {
      "planId": "abc123",
      "visitorId": "user-123",
      "conversationId": "conv-123",
      "title": "Paris Photo Trip",
      "location": "Paris, France",
      "duration": "3 days",
      "interests": ["architecture", "street", "landscape"],
      "htmlUrl": "https://aiscout.photo/plans/user-123/abc123.html",
      "createdAt": 1234567890,
      "expiresAt": 1234567890
    }
  ],
  "cursor": "next-page-token"
}
```

#### Get Plan

```http
GET /api/plans/:planId?visitorId=string
```

**Response:**
```json
{
  "planId": "abc123",
  "visitorId": "user-123",
  "conversationId": "conv-123",
  "title": "Paris Photo Trip",
  "location": "Paris, France",
  "duration": "3 days",
  "interests": ["architecture", "street", "landscape"],
  "htmlContent": "<!DOCTYPE html>...",
  "htmlUrl": "https://...",
  "createdAt": 1234567890,
  "expiresAt": 1234567890
}
```

#### Get Plan HTML

```http
GET /api/plans/:planId/html?visitorId=string
```

**Response:** HTML content (Content-Type: text/html)

#### Delete Plan

```http
DELETE /api/plans/:planId?visitorId=string
```

**Response:**
```json
{
  "success": true
}
```

## Data Models

### Conversation

```typescript
interface Conversation {
  visitorId: string;          // Partition key
  conversationId: string;     // Sort key
  createdAt: number;          // Unix timestamp
  updatedAt: number;          // Unix timestamp
  messageCount?: number;       // Number of messages
  lastMessage?: string;        // Preview of last message
  expiresAt: number;          // TTL for auto-deletion
}
```

### Message

```typescript
interface Message {
  visitorId: string;          // Partition key
  timestamp: number;          // Sort key (Unix timestamp)
  conversationId: string;     // GSI partition key
  role: 'user' | 'assistant';
  content: string;
  planId?: string;            // If message contains plan
  expiresAt: number;          // TTL for auto-deletion
}
```

### Plan

```typescript
interface Plan {
  visitorId: string;          // Partition key
  planId: string;             // Sort key
  conversationId: string;     // GSI partition key
  title: string;
  location: string;
  duration: string;
  interests: string[];
  htmlContent: string;        // Full HTML plan
  htmlUrl: string;            // CloudFront URL
  createdAt: number;          // GSI sort key
  expiresAt: number;          // TTL for auto-deletion
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Missing visitorId"
}
```

### 404 Not Found

```json
{
  "error": "Conversation not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

Currently no rate limiting implemented. For production:

1. Use API Gateway instead of Function URLs
2. Configure throttling:
   ```typescript
   const api = new apigateway.RestApi(this, 'PhotoScoutAPI', {
     throttle: {
       rateLimit: 100,
       burstLimit: 200
     }
   });
   ```

## DynamoDB Schema

### Messages Table

- **Table Name**: `photoscout-messages`
- **Partition Key**: `visitorId` (String)
- **Sort Key**: `timestamp` (Number)
- **GSI**: `conversationId-index`
  - Partition Key: `conversationId`
  - Sort Key: `timestamp`
- **TTL**: `expiresAt` (30 days)

### Conversations Table

- **Table Name**: `photoscout-conversations`
- **Partition Key**: `visitorId` (String)
- **Sort Key**: `conversationId` (String)
- **TTL**: `expiresAt` (30 days)

### Plans Table

- **Table Name**: `photoscout-plans`
- **Partition Key**: `visitorId` (String)
- **Sort Key**: `planId` (String)
- **GSI**: `conversationId-index`
  - Partition Key: `conversationId`
  - Sort Key: `createdAt`
- **TTL**: `expiresAt` (90 days)

### Users Table

- **Table Name**: `photoscout-users`
- **Partition Key**: `userId` (String)
- **GSI**: `email-index`
  - Partition Key: `email`

## S3 Structure

### HTML Plans Bucket

```
photoscout-plans-{accountId}/
└── {visitorId}/
    └── {planId}.html
```

**Access:** Via CloudFront at `/plans/{visitorId}/{planId}.html`

**Cache:** 365 days (plans are immutable)

## Lambda Functions

### Chat Function

- **Runtime**: Node.js 20
- **Memory**: 512 MB
- **Timeout**: 120 seconds
- **Invoke Mode**: RESPONSE_STREAM (SSE)

**Environment:**
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
DEEPSEEK_API_KEY=sk-xxxxx (optional)
ENVIRONMENT=production
MESSAGES_TABLE=photoscout-messages
CONVERSATIONS_TABLE=photoscout-conversations
PLANS_TABLE=photoscout-plans
HTML_PLANS_BUCKET=photoscout-plans-{accountId}
```

### Conversations Function

- **Runtime**: Node.js 20
- **Memory**: 256 MB
- **Timeout**: 30 seconds

### Plans Function

- **Runtime**: Node.js 20
- **Memory**: 256 MB
- **Timeout**: 30 seconds

## CloudFront Behaviors

```
/                     → S3 (Web App)
/api/chat             → Chat Lambda
/api/conversations*   → Conversations Lambda
/api/plans*           → Plans Lambda
/plans/*              → S3 (HTML Plans)
```

**Cache Policies:**
- Web app: No cache (for development)
- HTML plans: 365 days
- API: No cache

## Example Usage

### Create Conversation & Plan

```typescript
// 1. Send message
const response = await fetch('https://your-domain.com/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visitorId: 'user-123',
    message: 'Plan a 3-day photo trip to Tokyo'
  })
});

// 2. Read SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);

      if (data.type === 'plan') {
        console.log('Plan URL:', data.htmlUrl);
      }
    }
  }
}

// 3. List plans
const plansResponse = await fetch(
  `https://your-domain.com/api/plans?visitorId=user-123`
);
const { plans } = await plansResponse.json();
```

## Testing

### Local Testing

```bash
# Test chat endpoint
curl -N 'https://your-domain.com/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":"Hello"}'

# Test conversations
curl 'https://your-domain.com/api/conversations?visitorId=test'

# Test plans
curl 'https://your-domain.com/api/plans?visitorId=test'
```

### View Logs

```bash
./scripts/logs.sh chat
./scripts/logs.sh conversations
./scripts/logs.sh plans
```

## Performance

### Latency

- **Chat (first token)**: ~1-2 seconds
- **Chat (streaming)**: 20-50 ms per token
- **Conversations**: <100 ms
- **Plans**: <100 ms

### Optimization

1. **CloudFront**: Edge caching reduces latency
2. **DynamoDB**: Single-digit ms queries
3. **Lambda**: Warm starts <10ms
4. **Streaming**: Reduces perceived latency

## Security

### Implemented

- ✅ HTTPS only
- ✅ CORS configuration
- ✅ No public S3 access
- ✅ DynamoDB encryption at rest
- ✅ CloudWatch logging

### Recommended

- [ ] API Gateway for rate limiting
- [ ] JWT authentication
- [ ] Request validation
- [ ] Input sanitization
- [ ] WAF rules

## Monitoring

### CloudWatch Metrics

- Lambda invocations
- Lambda errors
- Lambda duration
- DynamoDB read/write capacity
- CloudFront requests
- CloudFront cache hit ratio

### Alarms

Configure alarms for:
- Lambda error rate > 1%
- Lambda duration > 30s
- DynamoDB throttled requests
- 5xx error rate

## Troubleshooting

### CORS Errors

```
Access to fetch at '...' has been blocked by CORS policy
```

**Solution:** Check Lambda CORS headers match frontend origin.

### Timeout Errors

```
Task timed out after 120.00 seconds
```

**Solution:** Increase Lambda timeout or optimize code.

### DynamoDB Throttling

```
ProvisionedThroughputExceededException
```

**Solution:** Switch to on-demand billing or increase provisioned capacity.

## Cost Optimization

### Current Setup (On-Demand)

- Lambda: $0.20 per 1M requests
- DynamoDB: $1.25 per 1M writes
- S3: $0.023 per GB
- CloudFront: $0.085 per GB

### Optimization Tips

1. Enable CloudFront caching for static content
2. Use DynamoDB TTL for automatic cleanup
3. Compress S3 objects
4. Monitor and optimize Lambda memory
5. Use reserved Lambda concurrency for predictable load

## Migration

### From Development to Production

1. Update `.env`:
   ```bash
   ENVIRONMENT=production
   ```

2. Configure custom domain:
   ```typescript
   // Add to infra stack
   const cert = acm.Certificate.fromCertificateArn(...);
   const distribution = new cloudfront.Distribution(this, {
     domainNames: ['app.yourdomain.com'],
     certificate: cert
   });
   ```

3. Update CORS:
   ```typescript
   allowedOrigins: ['https://app.yourdomain.com']
   ```

4. Deploy:
   ```bash
   pnpm deploy
   ```

## API Versioning

For future API changes:

1. Use path versioning: `/api/v2/chat`
2. Maintain backwards compatibility
3. Deprecate old versions gradually
4. Document breaking changes

## Support

- GitHub Issues: [Issues Page](https://github.com/yourusername/PhotoScout/issues)
- Email: vbolshakov87@gmail.com
