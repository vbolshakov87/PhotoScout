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

### 1. Store Anthropic API Key

```bash
aws ssm put-parameter \
  --name "/photoscout/anthropic-api-key" \
  --value "sk-ant-xxxxx" \
  --type "SecureString" \
  --region eu-central-1
```

### 2. Build & Deploy Infrastructure

```bash
# Build all packages
pnpm build

# Deploy to AWS
pnpm deploy

# Or manually:
cd infra && pnpm cdk deploy
```

The deployment will output your CloudFront URL. **Save this URL** - you'll need it for the iOS app.

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

## Troubleshooting

### Build Errors

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
```

### iOS Blank Screen

1. Check Xcode console for errors
2. Verify `Config.swift` has correct CloudFront URL (https://)
3. Check that web app is deployed and accessible in browser
4. Test API endpoints with curl

### Chat Not Streaming

- Check CloudWatch Logs: `/aws/lambda/PhotoScoutStack-ChatFunction`
- Verify SSM parameter exists: `aws ssm get-parameter --name /photoscout/anthropic-api-key`
- Test endpoint directly: `curl -X POST https://your-cf-domain/api/chat -d '{"visitorId":"test","message":"hi"}'`

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
