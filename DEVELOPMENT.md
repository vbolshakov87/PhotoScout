# PhotoScout Development Guide

Guide for local development and debugging.

## Local Development Setup

### Prerequisites

1. Deploy the backend first:
   ```bash
   ./deploy.sh
   ```

2. This creates `cdk-outputs.json` with your Lambda URLs

### Running the Web App Locally

The Vite dev server automatically proxies API requests to your deployed Lambda functions:

```bash
# Start dev server (defaults to port 5173)
pnpm dev:web

# Or specify a port
pnpm --filter @photoscout/web dev -- --port 5174
```

The `vite.config.ts` automatically:
- Reads Lambda URLs from `cdk-outputs.json`
- Proxies `/api/chat` → Chat Lambda
- Proxies `/api/conversations` → Conversations Lambda
- Proxies `/api/plans` → Plans Lambda

### How the Proxy Works

When you make a request to `http://localhost:5173/api/chat`:
1. Vite intercepts the request
2. Forwards it to the Lambda URL (e.g., `https://xxx.lambda-url.eu-central-1.on.aws/`)
3. Handles CORS automatically
4. Returns the response to your browser

This solves CORS issues when developing locally.

## Debugging

### Browser Console Logs

The app includes detailed logging. Open browser DevTools (F12) and check the Console:

**API Layer (`src/lib/api.ts`):**
```
API: Sending chat request to: /api/chat {visitorId: "...", message: "..."}
API: Response status: 200 headers: Headers {...}
API: Received chunk: data: {"type":"delta","content":"Hello"}...
API: Stream done, received 145 events
```

**Chat Hook (`src/hooks/useChat.ts`):**
```
Starting chat stream for message: Photo trip to Hamburg
Received event: {type: "delta", content: "I'd"}
Received event: {type: "delta", content: " be"}
Stream completed, total content length: 3547
```

### Common Issues

#### 1. CORS Errors on Localhost

**Symptom:**
```
Access to fetch at '...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Cause:** Trying to access Lambda URLs directly without proxy

**Solution:**
- Make sure you're using `/api/*` paths (not direct Lambda URLs)
- Vite proxy handles CORS
- Check `vite.config.ts` has correct Lambda URLs

#### 2. Messages Not Appearing

**Symptom:** User sends message, loading indicator shows, but no response appears

**Debug steps:**
1. Open browser console (F12)
2. Look for logs starting with "API:" and "Starting chat stream"
3. Check if events are being received:
   ```
   Received event: {type: "delta", content: "..."}
   ```

**Common causes:**
- API returning error (check console for "API: Error response")
- Insufficient Anthropic credits (check CloudWatch logs)
- Events not parsing correctly (check "Failed to parse event" errors)

**Solution:**
```bash
# Check Lambda logs for errors
./scripts/logs.sh chat --errors --since 10m

# Test API directly
curl -X POST 'https://your-lambda-url.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":"Hello"}'
```

#### 3. Proxy Not Working

**Symptom:**
```
[vite] http proxy error: ...
```

**Cause:** Lambda URLs not found or incorrect in `vite.config.ts`

**Solution:**
```bash
# Check CDK outputs exist
cat cdk-outputs.json

# If missing, redeploy
./deploy.sh

# Restart dev server
pnpm dev:web
```

## Testing Locally

### Test Chat Functionality

1. Start dev server:
   ```bash
   pnpm dev:web
   ```

2. Open http://localhost:5173

3. Send a test message:
   ```
   Photo trip to Hamburg this weekend
   ```

4. Check browser console for logs

5. Verify:
   - User message appears immediately
   - Loading indicator shows
   - Assistant response streams in word by word
   - No errors in console

### Test API Endpoints

```bash
# Use the test script
./scripts/test-api.sh

# Or test manually
CHAT_URL="https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/"

curl -X POST "$CHAT_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "visitorId": "test-123",
    "message": "Quick photo trip to Tokyo"
  }' \
  -v
```

## Monitoring Production

### View Live Logs

```bash
# Follow chat function logs
./scripts/logs.sh chat --follow

# Show only errors
./scripts/logs.sh chat --errors

# Last hour of logs
./scripts/logs.sh chat --since 1h
```

### Common Production Issues

#### Messages Not Showing on Production

**Symptom:** Chat works locally but not on CloudFront URL

**Debug:**
1. Open https://d2mpt2trz11kx7.cloudfront.net
2. Open browser DevTools console
3. Send a message
4. Check console logs

**Common causes:**
- API_BASE not set correctly (check `import.meta.env.VITE_API_URL`)
- CloudFront caching old version (clear cache)
- CORS issues (check Lambda CORS headers)

**Solution:**
```bash
# Check environment variable
echo $VITE_API_URL

# Rebuild and redeploy
pnpm build
./deploy.sh

# Clear browser cache
# Or open in incognito mode
```

#### Insufficient Credits Error

**Symptom:**
```json
{
  "type": "error",
  "error": {
    "message": "Your credit balance is too low..."
  }
}
```

**Solution:**
1. Go to https://console.anthropic.com/settings/billing
2. Add credits to your account
3. Wait 1-2 minutes for update
4. Try again (no redeploy needed)

## Making Changes

### Modify Frontend

```bash
# Make changes to files in packages/web/src/
# Dev server hot-reloads automatically

# When ready, build and deploy
pnpm build
./deploy.sh
```

### Modify Lambda Functions

```bash
# Make changes to files in packages/api/src/

# Rebuild and redeploy
pnpm --filter @photoscout/api build
pnpm --filter @photoscout/infra cdk deploy

# Or use the deploy script
./deploy.sh
```

### Modify Infrastructure

```bash
# Edit infra/lib/photoscout-stack.ts

# Deploy changes
pnpm --filter @photoscout/infra cdk deploy

# Or use the deploy script
./deploy.sh
```

## Environment Variables

### Local Development

The app uses these environment variables:

**Build time (.env):**
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Used by CDK during deployment
AWS_REGION=eu-central-1       # AWS region for deployment
```

**Runtime (browser):**
```bash
VITE_API_URL=/api             # Set to use proxy in dev
# or
VITE_API_URL=https://...      # Set to use direct URLs
```

### Production

On CloudFront, the app:
- Uses relative `/api` paths
- CloudFront routes to Lambda Function URLs
- No environment variables needed in browser

## Performance Tips

### Optimize Build

```bash
# Analyze bundle size
cd packages/web
pnpm run build
npx vite-bundle-visualizer
```

### Check Lambda Performance

```bash
# View Lambda metrics
./scripts/logs.sh chat | grep "Duration:"

# Example output:
# REPORT Duration: 1523.45 ms Billed Duration: 1524 ms Memory Size: 512 MB
```

### Reduce Cold Starts

Lambda cold starts can take 500-1000ms. To reduce:
1. Keep bundle size small (currently ~660KB)
2. Use Lambda reserved concurrency for production
3. Consider Lambda SnapStart (for Java, not Node.js yet)

## Troubleshooting Commands

```bash
# Check all deployed resources
aws cloudformation describe-stack-resources \
  --stack-name PhotoScoutStack \
  --region eu-central-1

# View Lambda function details
aws lambda get-function \
  --function-name PhotoScoutStack-ChatFunction... \
  --region eu-central-1

# Check DynamoDB tables
aws dynamodb list-tables --region eu-central-1

# View CloudFront distribution
aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Comment==`PhotoScout Web App`]'
```

## Useful Links

- **Web App:** https://d2mpt2trz11kx7.cloudfront.net
- **Anthropic Console:** https://console.anthropic.com
- **AWS Console:** https://console.aws.amazon.com
- **Claude API Docs:** https://docs.anthropic.com

## Getting Help

1. Check browser console for errors
2. Check Lambda logs: `./scripts/logs.sh chat`
3. Test API directly with curl
4. Check this guide's troubleshooting section
5. Review main [README.md](README.md) for common errors
