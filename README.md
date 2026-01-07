# PhotoScout

A mobile-first photo trip planning assistant. Users select a city and receive an interactive HTML plan with map, shooting spots, optimal timing, and walking routes.

**Goal:** TestFlight deployment ready for weekend testing

**Architecture:** Native iOS shell + React web views + Lambda API + DynamoDB

## Project Structure

```
photoscout/
├── packages/
│   ├── web/                  # React + Vite + Tailwind
│   ├── api/                  # Lambda functions
│   └── shared/               # Shared TypeScript types
├── infra/                    # AWS CDK infrastructure
└── ios/                      # iOS app (create in Xcode)
```

## Quick Start

### Prerequisites

- Node.js 20+ (use `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- AWS CLI configured
- AWS CDK (`npm install -g aws-cdk`)
- Xcode 15+ (for iOS app)

### Initial Setup

```bash
# Install dependencies
pnpm install

# Build shared package first
pnpm --filter @photoscout/shared build
```

### Development

```bash
# Web development
pnpm dev:web
# Opens at http://localhost:5173

# Build all packages
pnpm build

# Build just web or API
pnpm build:web
pnpm build:api
```

## Deployment

### Quick Deploy (Recommended)

Use the automated deployment script:

```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Deploy everything (checks prerequisites, builds, and deploys)
./deploy.sh
```

The script will:
- ✓ Check prerequisites (Node.js, pnpm, AWS CLI, CDK)
- ✓ Verify `.env` file configuration
- ✓ Install dependencies
- ✓ Build all packages
- ✓ Deploy CDK infrastructure
- ✓ Output deployment URLs
- ✓ Test the deployment

### Manual Deployment

If you prefer manual steps:

#### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-xxxxx
# AWS_REGION=eu-central-1
```

**Important:** The `.env` file is excluded from git. Never commit API keys to version control.

#### 2. Build & Deploy Infrastructure

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Deploy to AWS
pnpm deploy

# Or manually:
cd infra && pnpm cdk deploy
```

The deployment will output your CloudFront URL. **Save this URL** - you'll need it for the iOS app.

### Deployment Scripts

The project includes helpful scripts in the `scripts/` directory:

**View Logs:**
```bash
# View chat function logs
./scripts/logs.sh chat

# Follow logs in real-time
./scripts/logs.sh chat --follow

# Show only errors
./scripts/logs.sh chat --errors

# Show logs from last hour
./scripts/logs.sh chat --since 1h

# Other functions
./scripts/logs.sh conversations
./scripts/logs.sh plans
```

**Test API:**
```bash
# Test all API endpoints
./scripts/test-api.sh
```

**Destroy Stack:**
```bash
# Remove all AWS resources
./scripts/destroy.sh
```

### 3. Update iOS Config

After deployment, update `ios/PhotoScout/PhotoScout/Config.swift`:

```swift
static let apiBaseURL = "https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"
```

## iOS App Setup

The iOS app must be created in Xcode. Follow these steps:

### 1. Create New Xcode Project

1. Open Xcode
2. **File → New → Project**
3. Choose **iOS** → **App**
4. Configuration:
   - Product Name: `PhotoScout`
   - Team: (your Apple Developer team)
   - Organization Identifier: `com.yourname` (or your domain)
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: None
5. Save in `ios/PhotoScout/`

### 2. Add Swift Files

Create these files in Xcode (File → New → File → Swift File):

**App Structure:**
```
PhotoScout/
├── PhotoScoutApp.swift (main entry point)
├── MainTabView.swift
├── Config.swift
├── Views/
│   ├── ChatTab.swift
│   ├── PlansTab.swift
│   ├── PlanDetailView.swift
│   ├── HistoryTab.swift
│   └── ConversationDetailView.swift
├── Components/
│   ├── WebView.swift
│   ├── PlanRow.swift
│   └── ConversationRow.swift (includes EmptyStateView, LoadingView)
├── Models/
│   ├── Plan.swift
│   └── Conversation.swift
└── Services/
    └── APIService.swift
```

**Copy the Swift code from `docs/IOS_CODE.md` into each file** (see below for full code).

### 3. Update Info.plist

In Xcode, select `Info.plist` and add these keys:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### 4. Configure Signing

1. Select your project in Xcode Navigator
2. Select the **PhotoScout** target
3. Go to **Signing & Capabilities**
4. Check **Automatically manage signing**
5. Select your **Team**
6. The Bundle Identifier will auto-generate (e.g., `com.yourname.PhotoScout`)

### 5. Build and Test

1. Select a simulator (iPhone 15 Pro recommended)
2. Press **Cmd+R** to build and run
3. Test chat, plans, and history functionality

### 6. Deploy to TestFlight

1. **Product → Archive** (wait for build to complete)
2. When Organizer opens, click **Distribute App**
3. Choose **App Store Connect**
4. Click **Upload**
5. Go to [App Store Connect](https://appstoreconnect.apple.com)
6. Select your app
7. Go to **TestFlight** tab
8. Add internal or external testers
9. Submit for TestFlight review (required for external testers)

## Architecture Overview

### Frontend (React + Vite)
- Mobile-first responsive design
- Dark theme (#1a1a2e background)
- Streaming chat interface
- Interactive HTML plans with Leaflet maps
- Native bridge for iOS haptics and sharing

### Backend (AWS Lambda)
- **chat.ts** - Streams responses from Claude Sonnet 4
- **conversations.ts** - Manages conversation history
- **plans.ts** - Stores/retrieves photo trip plans
- DynamoDB with TTL (90 day auto-cleanup)

### iOS App (SwiftUI)
- Native TabView navigation (Chat, Plans, History)
- WKWebView for chat interface
- Native lists for Plans and History
- Haptic feedback integration
- Share functionality

## API Endpoints

### POST /api/chat
Stream chat responses (Server-Sent Events)

```typescript
// Request
{
  "visitorId": "uuid",
  "conversationId": "uuid (optional)",
  "message": "Hamburg photo trip this weekend"
}

// Response: SSE stream
data: {"type":"delta","content":"..."}
data: {"type":"plan_saved","planId":"uuid"}
data: {"type":"done","conversationId":"uuid"}
```

### GET /api/conversations
List conversations: `?visitorId=xxx&limit=20&cursor=xxx`

### GET /api/conversations/:id
Get conversation with messages: `?visitorId=xxx`

### GET /api/plans
List plans: `?visitorId=xxx&limit=20&cursor=xxx`

### GET /api/plans/:id
Get plan with HTML: `?visitorId=xxx`

### DELETE /api/plans/:id
Delete plan: `?visitorId=xxx`

## Database Schema

### Messages Table
```
PK: visitorId (STRING)
SK: timestamp (NUMBER)
Attributes: messageId, conversationId, role, content, isHtml, model
GSI: conversationId-index (conversationId, timestamp)
TTL: expiresAt
```

### Conversations Table
```
PK: visitorId (STRING)
SK: conversationId (STRING)
Attributes: title, city, messageCount, createdAt, updatedAt
TTL: expiresAt
```

### Plans Table
```
PK: visitorId (STRING)
SK: planId (STRING)
Attributes: conversationId, city, title, htmlContent, spotCount, createdAt
GSI: conversationId-index (conversationId, createdAt)
TTL: expiresAt
```

## Cost Estimates

Monthly for moderate use (100 active users):
- **DynamoDB:** ~$5 (on-demand pricing)
- **Lambda:** ~$10 (free tier covers most)
- **CloudFront:** ~$5
- **S3:** <$1
- **Anthropic API:** Variable (depends on usage)

**Total: ~$20-30/month + Claude API costs**

## Troubleshooting & Common Errors

This section documents all errors encountered during development and their solutions.

### Error 1: TypeScript Compilation Failures

**Symptoms:**
```
packages/web/src/components/chat/Chat.tsx(1,10): error TS6133: 'useState' is declared but its value is never read.
packages/web/src/vite-env.d.ts(1,1): error TS2688: Cannot find type definition file for 'vite/client'.
Property 'env' does not exist on type 'ImportMeta'
```

**Root Cause:**
- Unused imports in React components
- Missing Vite type definitions for `import.meta.env`
- Unused state variables

**Solution:**
1. Remove unused imports from `Chat.tsx` and other components
2. Create `packages/web/src/vite-env.d.ts` with proper type definitions:
   ```typescript
   /// <reference types="vite/client" />

   interface ImportMetaEnv {
     readonly VITE_API_URL?: string
   }

   interface ImportMeta {
     readonly env: ImportMetaEnv
   }
   ```
3. Remove unused state variables from components

**Verification:** Run `pnpm -r build` - should complete without errors

---

### Error 2: SSM SecureString Not Supported in Lambda Environment

**Symptoms:**
```
SSM Secure reference is not supported in Lambda environment variables.
Use plaintext or KMS-encrypted values instead.
```

**Root Cause:**
AWS Lambda does not support SSM SecureString parameters directly in environment variables. Only plaintext or KMS-encrypted values are supported.

**Initial Solution (Workaround):**
- Pass SSM parameter name instead of value
- Modified Lambda to fetch from SSM at runtime using `@aws-sdk/client-ssm`
- Added caching to avoid repeated SSM calls

**Final Solution (Recommended):**
After encountering API key validation issues with SSM, switched to `.env` file approach:

1. Create `.env.example` template:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   AWS_REGION=eu-central-1
   ```

2. Create `.env` with actual key (excluded from git)

3. Update `infra/lib/photoscout-stack.ts`:
   ```typescript
   import * as dotenv from 'dotenv';
   dotenv.config({ path: path.join(__dirname, '../../.env') });

   const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
   if (!anthropicApiKey) {
     throw new Error('ANTHROPIC_API_KEY environment variable is required');
   }

   // Pass directly to Lambda
   environment: {
     ANTHROPIC_API_KEY: anthropicApiKey,
   }
   ```

4. Add `dotenv` to `infra/package.json` dependencies

5. Simplify `packages/api/src/lib/anthropic.ts`:
   ```typescript
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
   });
   ```

**Verification:** Deploy and check CloudWatch logs - API key should be accessible

---

### Error 3: OPTIONS Method Invalid for Lambda Function URLs

**Symptoms:**
```
OPTIONS is not a valid enum value.
Supported values: [GET, PUT, HEAD, POST, PATCH, DELETE, *]
```

**Root Cause:**
Lambda Function URLs handle CORS preflight OPTIONS requests automatically. Explicitly adding `lambda.HttpMethod.OPTIONS` to the CORS configuration causes a validation error.

**Solution:**
Remove `lambda.HttpMethod.OPTIONS` from CORS configuration in `infra/lib/photoscout-stack.ts`:

```typescript
cors: {
  allowedOrigins: ['*'],
  allowedMethods: [
    lambda.HttpMethod.GET,
    lambda.HttpMethod.POST,
    lambda.HttpMethod.DELETE,
    // Removed: lambda.HttpMethod.OPTIONS
  ],
  allowedHeaders: ['*'],
  allowCredentials: false,
}
```

**Verification:** CDK deploy should succeed without validation errors

---

### Error 4: ES Module Import Error in Lambda

**Symptoms:**
```
Cannot use import statement outside a module
SyntaxError: Cannot use import statement outside a module
```

**Root Cause:**
Lambda function code uses ES module syntax (`import`/`export`) but Node.js doesn't recognize the bundled output as an ES module because it lacks `"type": "module"` in package.json.

**Solution:**
Modify the build script in `packages/api/package.json` to create a `package.json` file in the dist folder:

```json
"build": "esbuild src/handlers/*.ts --bundle --platform=node --target=node20 --outdir=dist --format=esm --external:@aws-sdk/* && echo '{\"type\":\"module\"}' > dist/package.json"
```

This creates `dist/package.json` with:
```json
{"type":"module"}
```

**Verification:** Deploy and invoke Lambda - should execute without syntax errors

---

### Error 5: Dynamic Require Error with Anthropic SDK

**Symptoms:**
```
Dynamic require of "stream" is not supported
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**Root Cause:**
When bundling the Anthropic SDK with esbuild in ES module format, the SDK's internal use of `require()` for dynamic imports fails because `require` is not available in ES modules.

**Solution:**
Add an esbuild banner to create a `require` function using Node.js's `createRequire`:

```json
"build": "esbuild src/handlers/*.ts --bundle --platform=node --target=node20 --outdir=dist --format=esm --external:@aws-sdk/* --banner:js=\"import { createRequire } from 'module'; const require = createRequire(import.meta.url);\" && echo '{\"type\":\"module\"}' > dist/package.json"
```

Also removed `--external:@anthropic-ai/sdk` to ensure the SDK is bundled (external packages can't use the injected require).

**Verification:** Test chat endpoint - should stream responses without require errors

---

### Error 6: Anthropic API Authentication Failure

**Symptoms:**
```
BadRequestError: 400 invalid x-api-key
{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

**Root Cause:**
API key stored in SSM parameter was outdated or invalid. This error can also occur if:
- API key format is incorrect
- Key doesn't have proper permissions
- Account has insufficient credits

**Solution:**
1. **Verify API Key:** Get a fresh key from [Anthropic Console](https://console.anthropic.com/settings/keys)

2. **Update .env file:**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-actual-valid-key
   ```

3. **Rebuild and redeploy:**
   ```bash
   pnpm build
   pnpm deploy
   ```

4. **Check CloudWatch logs** for the actual error:
   ```bash
   aws logs tail /aws/lambda/PhotoScoutStack-ChatFunction3D7C447E-XXXXX --since 5m
   ```

**Common API Key Issues:**
- **Invalid format:** Must start with `sk-ant-`
- **Insufficient credits:** Error message will mention credit balance
- **Expired key:** Regenerate in Anthropic Console
- **Wrong region:** Ensure using the correct Anthropic endpoint

**Verification:**
```bash
curl -X POST 'https://your-lambda-url.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test-123","message":"Hello"}'
```

Should stream back a response, not return 401/400 authentication errors.

---

### General Build Errors

```bash
# Clean install
rm -rf node_modules packages/*/node_modules
pnpm install

# Rebuild shared package
pnpm --filter @photoscout/shared build
```

### CDK Deployment Fails

```bash
# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/eu-central-1

# Check deployed stacks
aws cloudformation list-stacks --region eu-central-1

# View detailed stack events
aws cloudformation describe-stack-events --stack-name PhotoScoutStack --region eu-central-1
```

### iOS Blank Screen

1. Check Xcode console for errors
2. Verify `Config.swift` has correct CloudFront URL (https://)
3. Check that web app is deployed and accessible in browser
4. Test API endpoints with curl

### Chat Not Streaming

1. **Check CloudWatch Logs:**
   ```bash
   # Find log group
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/PhotoScout

   # Tail logs
   aws logs tail /aws/lambda/PhotoScoutStack-ChatFunction3D7C447E-XXXXX --follow --since 5m
   ```

2. **Verify environment variables in Lambda:**
   ```bash
   aws lambda get-function-configuration --function-name PhotoScoutStack-ChatFunction3D7C447E-XXXXX
   ```

3. **Test endpoint directly:**
   ```bash
   curl -X POST 'https://your-lambda-url.on.aws/' \
     -H 'Content-Type: application/json' \
     -d '{"visitorId":"test","message":"hi"}' \
     -v
   ```

## Development Tips

### Local iOS Testing

1. Update `Config.swift`:
   ```swift
   static let apiBaseURL = "http://localhost:5173"
   ```
2. Run `pnpm dev:web`
3. Build iOS app in **Simulator** (won't work on physical device with localhost)
4. For device testing, use [ngrok](https://ngrok.com) or deploy to AWS

### Debugging Lambda

```bash
# Tail CloudWatch logs
aws logs tail /aws/lambda/PhotoScoutStack-ChatFunction --follow --region eu-central-1

# Get recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/PhotoScoutStack-ChatFunction \
  --filter-pattern "ERROR" \
  --region eu-central-1
```

### Testing Web App Standalone

The web app works standalone in browser. Just visit your CloudFront URL.

## Project Checklist

- [x] Monorepo structure with pnpm workspaces
- [x] Shared TypeScript types package
- [x] React web app with Vite
- [x] Chat interface with streaming
- [x] Lambda API handlers
- [x] DynamoDB schema
- [x] CDK infrastructure code
- [x] iOS app structure documented
- [ ] Create iOS Xcode project
- [ ] Add Swift files to Xcode
- [ ] Test iOS app in simulator
- [ ] Deploy to TestFlight

## Next Steps

1. **Deploy backend:** `pnpm build && pnpm deploy`
2. **Create iOS app in Xcode** (follow instructions above)
3. **Add all Swift files** from IOS_CODE.md
4. **Update Config.swift** with your CloudFront URL
5. **Test in simulator**
6. **Archive and upload to TestFlight**

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [TestFlight Guide](https://developer.apple.com/testflight/)

## License

MIT

## Author

Vladimir Bolshakov - Landscape & Travel Photographer

---

For complete iOS Swift code, see [IOS_CODE.md](docs/IOS_CODE.md)
