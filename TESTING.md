# PhotoScout Testing Guide

How to test and debug the chat functionality.

## Quick Test

### 1. Test Production (CloudFront)

```bash
# Open the production URL
open https://d2mpt2trz11kx7.cloudfront.net
```

1. Open browser DevTools (F12) → Console tab
2. Send a test message: "Photo trip to Hamburg"
3. Watch the console for logs

**Expected logs:**
```
API: Sending chat request to: /api/chat {visitorId: "...", message: "..."}
API: Response status: 200 headers: Headers {...}
API: Received chunk: data: {"type":"delta","content":"I'd"}...
Starting chat stream for message: Photo trip to Hamburg
Received event: {type: "delta", content: "I'd"}
Received event: {type: "delta", content: " be"}
...
Stream completed, total content length: 3547
```

**Expected behavior:**
- User message appears immediately
- Loading indicator shows
- Assistant response streams in word by word
- Response fully visible after completion

### 2. Test Localhost

```bash
# Start dev server
pnpm dev:web

# Open http://localhost:5173 (or whatever port Vite shows)
```

Follow the same steps as production.

## Common Issues & Solutions

### Issue 1: "No response received from server"

**Symptom:** Error message appears instead of response

**Check console logs:**
```
Stream completed, total content length: 0
No content received from stream
```

**Possible causes:**
1. **Insufficient Anthropic credits**
   ```bash
   # Check Lambda logs
   ./scripts/logs.sh chat --errors --since 10m

   # Look for:
   # "Your credit balance is too low..."
   ```
   **Solution:** Add credits at https://console.anthropic.com/settings/billing

2. **API returning error**
   ```bash
   # Check logs for errors
   ./scripts/logs.sh chat --since 5m
   ```
   **Solution:** Fix the error shown in logs

3. **Stream parsing issue**
   - Look for "API: Failed to parse event:" in console
   - Check "API: Received chunk:" to see actual data

### Issue 2: Message appears but empty

**Symptom:** Assistant message bubble shows but with no text

**Debug:**
1. Check console: "Stream completed, total content length: X"
   - If X > 0, content was received but not displayed
   - Check React DevTools to see if message state has content

2. Check if `isHtml` flag is set incorrectly
   - If response is HTML plan, it might render differently

**Solution:**
```javascript
// In browser console, check messages state:
// (This only works if you expose it for debugging)
console.log(messages);
```

### Issue 3: CORS errors on localhost

**Symptom:**
```
Access to fetch at '...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solution:**
1. Check `vite.config.ts` has correct Lambda URLs
2. Make sure you're using `/api/*` paths, not direct Lambda URLs
3. Restart dev server: `pnpm dev:web`

### Issue 4: Proxy errors on localhost

**Symptom:**
```
[vite] http proxy error: ECONNREFUSED
```

**Cause:** Lambda URLs in `vite.config.ts` are incorrect

**Solution:**
```bash
# Check CDK outputs
cat cdk-outputs.json

# If missing or wrong, redeploy
./deploy.sh

# Restart dev server
pnpm dev:web
```

## Detailed Debugging

### Step 1: Check Lambda is working

```bash
# Test Lambda directly
curl -X POST 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test-debug","message":"Quick test"}' \
  -v
```

**Expected output:**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
...

data: {"type":"delta","content":"I'd"}

data: {"type":"delta","content":" be"}

...

data: {"type":"done","conversationId":"..."}
```

If you get an error or 500, check Lambda logs:
```bash
./scripts/logs.sh chat --since 5m
```

### Step 2: Check Browser Fetch

Open browser console and run:

```javascript
// Test fetch directly
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    visitorId: 'test-' + Date.now(),
    message: 'test'
  })
});

console.log('Status:', response.status);
console.log('Headers:', [...response.headers.entries()]);

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  console.log('Chunk:', decoder.decode(value));
}
```

**Expected output:**
- Status: 200
- Headers include `content-type: text/event-stream`
- Multiple chunks with SSE formatted data

### Step 3: Use Test Page

I've created a test page for you:

```bash
# Copy test page to web public folder
cp test-stream.html packages/web/public/

# Rebuild and deploy
pnpm build
./deploy.sh

# Visit: https://d2mpt2trz11kx7.cloudfront.net/test-stream.html
```

Or open it locally:
```bash
open test-stream.html
```

Use the test buttons to see detailed logging of the streaming process.

### Step 4: Check Message State

Add this to your browser console while on the chat page:

```javascript
// Hook into React DevTools to see state
// First install React DevTools extension
// Then inspect the Chat component

// Or add temporary logging
localStorage.setItem('debug', 'true');
// (Requires adding debug flag to code)
```

## Performance Testing

### Check Response Time

```bash
# Time the Lambda response
time curl -X POST 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":"Quick test"}' \
  -o /dev/null -s

# Should complete in 5-15 seconds depending on response length
```

### Check Lambda Metrics

```bash
# View Lambda execution times
./scripts/logs.sh chat | grep "Duration:"

# Example output:
# REPORT Duration: 8166.10 ms Billed Duration: 8738 ms
```

Good performance: 5-15 seconds
Slow: 20+ seconds (check Anthropic API status)

### Check Memory Usage

```bash
./scripts/logs.sh chat | grep "Max Memory Used"

# Should be under 200 MB
# If higher, might indicate memory leak
```

## Load Testing

### Test Multiple Concurrent Requests

```bash
# Send 5 concurrent requests
for i in {1..5}; do
  curl -X POST 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/' \
    -H 'Content-Type: application/json' \
    -d "{\"visitorId\":\"load-test-$i\",\"message\":\"test $i\"}" \
    -o "response-$i.txt" &
done
wait

# Check all responses
cat response-*.txt
rm response-*.txt
```

## Error Scenarios to Test

### 1. Invalid Input

```bash
# Missing visitorId
curl -X POST 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"message":"test"}'

# Expected: 400 error with "Missing visitorId or message"
```

### 2. Empty Message

```bash
curl -X POST 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":""}'

# Expected: 400 error
```

### 3. Very Long Message

```javascript
// In browser console
const longMessage = 'test '.repeat(1000); // 5000 chars
// Send via UI and check if it works
```

## Monitoring Production

### Real-time Monitoring

```bash
# Watch logs live
./scripts/logs.sh chat --follow

# In another terminal, test the app
# Watch logs appear in real-time
```

### Error Monitoring

```bash
# Check for errors in last hour
./scripts/logs.sh chat --errors --since 1h

# Set up alerts (optional)
# Use CloudWatch Alarms for production
```

### User Experience Metrics

Things to measure:
1. **Time to first token**: How long until first word appears
2. **Total response time**: Complete response time
3. **Error rate**: How many requests fail
4. **Token throughput**: Tokens per second

## Troubleshooting Checklist

When chat isn't working:

- [ ] Check browser console for errors
- [ ] Check Lambda logs: `./scripts/logs.sh chat`
- [ ] Verify Anthropic credits: https://console.anthropic.com
- [ ] Test Lambda directly with curl
- [ ] Clear browser cache / try incognito
- [ ] Check network tab in DevTools
- [ ] Verify API_BASE is correct (console.log in api.ts)
- [ ] Check DynamoDB tables exist
- [ ] Verify Lambda has permissions
- [ ] Check CloudFront isn't caching API responses

## Success Criteria

✅ Chat is working when:
1. User message appears immediately
2. Loading indicator shows
3. Assistant response streams in smoothly
4. No errors in console
5. Response fully visible after completion
6. Can send multiple messages in sequence
7. Conversation history persists

## Getting Help

If you're still having issues after trying everything above:

1. **Collect debugging info:**
   ```bash
   # Save to a file
   {
     echo "=== Browser Console Logs ==="
     # Copy/paste from browser console

     echo "=== Lambda Logs ==="
     ./scripts/logs.sh chat --since 30m

     echo "=== Test Response ==="
     curl -v -X POST 'https://...' -H 'Content-Type: application/json' \
       -d '{"visitorId":"test","message":"test"}'
   } > debug-info.txt
   ```

2. **Check main guides:**
   - [README.md](README.md) - General troubleshooting
   - [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup
   - [QUICKSTART.md](QUICKSTART.md) - Initial setup

3. **Common fixes:**
   - Redeploy: `./deploy.sh`
   - Clear cache: Hard refresh (Cmd+Shift+R)
   - Check credits: Add to Anthropic account
   - Restart: Kill all node processes and restart

Good luck! 🚀
