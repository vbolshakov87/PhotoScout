# PhotoScout Development To-Do List

## Context
PhotoScout is a photography trip planning app that uses Claude AI to generate interactive HTML trip plans. The app consists of:
- **iOS Native App** (Swift/SwiftUI) - mobile interface
- **Web App** (React/TypeScript/Vite) - embedded in iOS WebView
- **Backend** (AWS Lambda + DynamoDB) - API endpoints
- **Infrastructure** (AWS CDK) - S3, CloudFront, Lambda, DynamoDB

Current deployment uses Claude Sonnet 4. The app streams responses from Claude and displays them in a chat interface. When Claude generates HTML trip plans, they should be rendered in an iframe preview.

---

## 🔴 CRITICAL BUG FIXES (Priority 1)

### 1. Add Markdown Rendering Support
**Problem:** LLM responses use markdown formatting (bold, lists, etc.) but they're displayed as plain text. This makes the clarifying questions hard to read.

**Files to modify:**
- `packages/web/src/components/chat/MessageBubble.tsx`
- `packages/web/package.json` (add markdown library)

**Solution:**
1. Install markdown rendering library:
   - Option A: `react-markdown` (most popular, 11MB)
   - Option B: `marked` + `DOMPurify` (lighter, more control)
   - **Recommended:** `react-markdown` with `remark-gfm` for GitHub-flavored markdown

2. Update `MessageBubble.tsx`:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MessageBubble({ message }: MessageBubbleProps) {
  const { share, copyToClipboard, haptic } = useNativeBridge();
  const isUser = message.role === 'user';
  const isHtml = message.content.includes('<!DOCTYPE html>');
  
  // Check if it's markdown (has markdown syntax)
  const isMarkdown = !isUser && !isHtml && (
    message.content.includes('**') || 
    message.content.includes('\n- ') ||
    message.content.includes('\n1. ')
  );

  if (isHtml) {
    // ... existing HTML preview logic
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-card text-foreground rounded-bl-md'
        }`}
      >
        {isMarkdown ? (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert prose-sm max-w-none"
            components={{
              // Customize styling
              strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="ml-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
```

3. Install dependencies:
```bash
cd packages/web
npm install react-markdown remark-gfm
```

4. Add CSS for prose styling (or use Tailwind's `@tailwindcss/typography` plugin):
```bash
npm install -D @tailwindcss/typography
```

Update `tailwind.config.js`:
```js
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

**Test:** Send a message, verify markdown renders correctly (bold, lists, numbers, etc.)

---

### 2. Fix HTML Not Displaying in Web View
**Problem:** Generated HTML by the agent is not shown in the preview. The LLM generates text like "PhotoScout Trip Plan" before the `<html>` tag, which breaks HTML rendering.

**Files to modify:**
- `packages/web/src/components/shared/HtmlPreview.tsx`
- `packages/web/src/hooks/useChat.ts` (line 63: `isHtml: assistantContent.includes('<!DOCTYPE html>')`)
- `packages/web/src/components/chat/MessageBubble.tsx` (line 13: `isHtml` detection)

**Solution:**
1. Update HTML detection logic to find the start of HTML (`<!DOCTYPE html>` or `<html>`) and extract only the HTML portion
2. Modify `HtmlPreview.tsx` to extract and render only the HTML content, ignoring any prefix text
3. Add fallback handling if HTML is malformed
4. Consider displaying prefix text (like "PhotoScout Trip Plan") separately above the preview

**Test:** Create a message with text before HTML and verify preview works correctly.

---

### 3. Add Two-Tab Layout to Web View
**Problem:** Currently only shows chat. Need to show both chat and HTML preview in separate tabs.

**Files to create/modify:**
- `packages/web/src/components/chat/Chat.tsx` - refactor to support tabs
- `packages/web/src/components/chat/TabbedView.tsx` - new component for tab layout
- `packages/web/src/pages/ChatPage.tsx` - integrate tabbed view

**Solution:**
1. Create a `TabbedView` component with two tabs: "Chat" and "Preview"
2. Chat tab: show normal chat interface
3. Preview tab: show only the HTML preview (full-screen iframe)
4. Show "Preview" tab only when HTML content is available
5. Add badge/indicator on Preview tab when new HTML is generated
6. Persist active tab selection in localStorage

**Design:**
- Use bottom tab bar (iOS-style) or top tabs (Material-style)
- Smooth tab transitions
- Mobile-friendly tap targets

**Test:** Generate HTML plan, switch between tabs, verify both render correctly.

---

### 4. Improve System Prompt for Multi-Turn Conversations
**Problem:** Need to ensure LLM asks clarifying questions BEFORE generating expensive HTML (saves tokens and improves results).

**Files to modify:**
- `packages/api/src/lib/prompts.ts`

**Solution:**
Update the system prompt to emphasize the conversation flow:

```typescript
export const SYSTEM_PROMPT = `You are PhotoScout, a photography trip planning assistant created by Vladimir Bolshakov, a landscape and travel photographer.

## Your Role
Help photographers plan efficient photo trips to cities worldwide. You create detailed, actionable shooting plans with specific locations, coordinates, optimal timing, and walking routes.

## CRITICAL: Two-Phase Conversation Flow

### Phase 1: Clarifying Questions (REQUIRED)
**ALWAYS start by asking clarifying questions. Do NOT generate HTML immediately.**

Use markdown formatting for clarity:
- **Bold** for emphasis
- Numbered lists for questions
- Clear, concise language

Essential questions to ask:
1. **Exact duration:** 3 days or 4 days? Specific dates or "this weekend"?
2. **Base location preference:**
   - Specific region (e.g., Skagen area)
   - Specific landmark (e.g., Rubjerg Knude lighthouse)
   - Full circuit covering multiple regions
3. **Transportation:**
   - Rental car available?
   - Comfortable with coastal/rough roads?
4. **Photography priorities:**
   - Classic postcard shots
   - Dramatic weather/stormy conditions
   - Golden hour/blue hour focus
   - Specific interests (architecture, landscapes, seascapes, etc.)
5. **Equipment:**
   - Tripod available?
   - Lens range?
   - ND filters for long exposures?
6. **Physical constraints:**
   - Mobility considerations?
   - Comfort with hiking/walking distances?

### Phase 2: HTML Generation (ONLY after questions are answered)
Once you have sufficient information, generate a single, complete HTML document with NO markdown, NO explanatory text outside the HTML.

## HTML Output Requirements
You MUST respond with a single HTML document that includes:

1. **Interactive Leaflet Map** - Dark theme (CartoDB dark_all tiles), numbered markers for each spot
2. **Shooting Strategy Section** - Sun times for the date, timeline with optimal order
3. **Spot Cards** - Each location with:
   - Name and number (clickable to pan map)
   - Exact GPS coordinates
   - Google Maps link
   - Flickr search link for examples
   - Description: what to shoot, composition tips, lens suggestions
   - Tags: best time (Morning/Blue Hour/Golden Hour/Night), style (Reflections/Leading Lines/etc.)
   - Priority indicator for must-get shots
4. **Walking Route** - Polyline on map showing efficient path, distances between spots
5. **Practical Info** - Nearest transit, total walking distance

## Style Guidelines (HTML only)
- Dark UI theme (#1a1a2e background, white/gray text)
- Color-coded spots (consistent between map markers and cards)
- Mobile-responsive grid layout
- Use emojis sparingly for visual scanning (🌅 ☀️ ⭐ 📍 📸)

## Photography Knowledge
You understand:
- Golden hour, blue hour, and their qualities for different subjects
- Architecture photography: leading lines, symmetry, reflections
- Cityscape timing: when lights turn on vs sky still has color
- Seasonal light differences (sun angle, sunrise/sunset times)
- Weather considerations (overcast for even light, mist for mood)
- Practical constraints (tripod-friendly spots, crowds, access)

## Important Rules
- **NEVER generate HTML in the first response** - always ask questions first
- Use markdown formatting for clarifying questions (makes them easier to read)
- Only generate HTML after user provides sufficient details
- Always use real coordinates from your knowledge
- Include 5-10 spots depending on trip length
- Optimize route for light (start position varies by morning vs evening shoot)
- Link to Flickr searches so users can see example shots
- If you don't know a city well, say so and suggest well-documented alternatives

## Example Interaction

**User:** "Hamburg this weekend"

**You (Phase 1 - Markdown):**
"Great choice! Hamburg's HafenCity and Speicherstadt are incredible for architecture photography. A few questions to create your perfect plan:

1. **Duration:** Are you shooting Saturday, Sunday, or both?
2. **Time preference:** More interested in sunrise/morning or sunset/blue hour sessions?
3. **Equipment:** Do you have a tripod for long exposures?
4. **Transportation:** Will you have a car or using public transit?
5. **Style:** Classic architecture shots or also interested in street/people photography?"

**User:** "Both days, I prefer sunset and blue hour, I have a tripod and will use public transit"

**You (Phase 2 - HTML):**
<!DOCTYPE html>
<html>
...complete HTML document...
</html>

## Token Efficiency
By asking questions first, we:
- Avoid generating incorrect HTML that needs regeneration (saves ~4000 tokens)
- Get better information, leading to better plans
- Create a more personalized experience`;
```

**Test:** Send vague request like "Hamburg", verify LLM asks questions before generating HTML.

---

## 🟠 NEW FEATURES (Priority 2)

### 5. Save Generated HTML to S3 with CloudFront Links
**Problem:** HTML is currently stored in DynamoDB. Need to save as S3 files with CloudFront URLs.

**Why:** DynamoDB has item size limits (400KB). S3 is better for large HTML files and can serve them directly via CloudFront.

**Priority:** This should be done AFTER markdown rendering (#1) and improved prompts (#4), since those will reduce the need for regenerating plans.

**Files to modify:**
- `infra/lib/photoscout-stack.ts` - add S3 bucket for HTML plans
- `packages/api/src/handlers/chat.ts` - add S3 upload logic
- `packages/api/src/lib/s3.ts` - new file for S3 operations
- `packages/shared/src/types.ts` - add `htmlUrl` and `s3Key` to Plan type
- `packages/api/package.json` - add `@aws-sdk/client-s3` dependency

**Solution:**
1. Create new S3 bucket: `photoscout-plans-${accountId}`
2. Upload HTML to S3 with key: `${visitorId}/${planId}.html`
3. Store in DynamoDB:
   - `htmlUrl`: CloudFront URL (e.g., `https://xxx.cloudfront.net/plans/${visitorId}/${planId}.html`)
   - `s3Key`: S3 object key
   - Remove `htmlContent` field (or make it optional for backwards compatibility)
4. Add CloudFront behavior: `/plans/*` → S3 bucket origin
5. Update Lambda to have S3 write permissions
6. Add environment variable: `PLANS_BUCKET_NAME`

**Migration:** Keep `htmlContent` in DynamoDB for existing plans, but new plans use S3.

**Test:** Generate plan, verify S3 upload, check CloudFront URL works, verify DynamoDB record.

---

### 6. Add Google OAuth Login (Native iOS)
**Problem:** No authentication. Need native Google Sign-In for iOS.

**Files to create/modify:**
- `ios/PhotoScout/Services/AuthService.swift` - new auth service
- `ios/PhotoScout/Views/LoginView.swift` - new login screen
- `ios/PhotoScout/PhotoScoutApp.swift` - add auth state check
- `ios/PhotoScout.xcodeproj/project.pbxproj` - add Google Sign-In SDK
- `packages/api/src/middleware/auth.ts` - new auth middleware
- `packages/api/src/handlers/*` - add auth to all handlers

**Solution:**

**iOS Side:**
1. Add Google Sign-In SDK via Swift Package Manager:
   - URL: `https://github.com/google/GoogleSignIn-iOS`
2. Configure Google Cloud Console:
   - Create OAuth 2.0 client ID for iOS
   - Add bundle identifier: `com.photoscout.app` (update as needed)
3. Create `AuthService.swift`:
   - Handle Google Sign-In flow
   - Store ID token in Keychain (use `KeychainAccess` library)
   - Provide logout functionality
4. Create `LoginView.swift`:
   - Google Sign-In button (native style)
   - Privacy policy link
   - Terms of service link
5. Update `PhotoScoutApp.swift`:
   - Check auth state on launch
   - Show LoginView if not authenticated
   - Show MainTabView if authenticated
6. Pass ID token to WebView via JavaScript bridge:
   - Add `postMessage` bridge in `WebView.swift`
   - Send token on page load: `webView.evaluateJavaScript("window.setAuthToken('\(token)')")`

**Backend Side:**
1. Create `auth.ts` middleware:
   - Verify Google ID token using `google-auth-library`
   - Extract user info (email, name, sub)
   - Attach to request context
2. Replace `visitorId` with authenticated `userId` (Google sub)
3. Update all Lambda handlers to require authentication
4. Add CORS headers to accept Authorization header

**Environment Variables:**
- `GOOGLE_CLIENT_ID` - iOS client ID
- `GOOGLE_CLIENT_IDS` - comma-separated list (iOS, web if needed)

**Dependencies:**
- iOS: `GoogleSignIn-iOS` (SPM)
- iOS: `KeychainAccess` (SPM) - for secure token storage
- Backend: `google-auth-library` (npm)

**Test:** Sign in via Google, verify token storage, verify API requests use auth, test logout.

---

### 7. Store User Data with Encryption in DynamoDB
**Problem:** Need to store user profile and encrypted auth tokens.

**Files to create/modify:**
- `infra/lib/photoscout-stack.ts` - add Users table
- `packages/api/src/lib/dynamo.ts` - add user operations
- `packages/api/src/lib/encryption.ts` - new encryption utilities
- `packages/shared/src/types.ts` - add User type

**Solution:**

**DynamoDB Schema:**
```typescript
// Users Table
{
  userId: string;          // PK - Google sub
  email: string;           // email address
  name: string;            // display name
  profilePicture?: string; // Google profile picture URL
  encryptedRefreshToken?: string; // AES-256 encrypted
  createdAt: number;       // timestamp
  lastLoginAt: number;     // timestamp
  updatedAt: number;       // timestamp
}
```

**Encryption:**
1. Use `aws-sdk` KMS for encryption key management
2. Create KMS key in CDK stack
3. Use `@aws-crypto/client-node` library (AWS Encryption SDK)
4. Encrypt refresh token before storing
5. Decrypt when needed for token refresh

**Alternative (simpler):** Use `crypto` module with environment variable secret:
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString();
}
```

**Recommended Library:** `@aws-crypto/client-node` (AWS Encryption SDK)
- Handles key rotation
- Integrates with KMS
- Battle-tested

**Files:**
1. `packages/api/src/lib/encryption.ts` - encryption utilities
2. `packages/api/src/lib/dynamo.ts` - add `saveUser`, `getUser`, `updateUserLogin`
3. Update auth middleware to create/update user record on login

**Environment Variables:**
- `ENCRYPTION_KEY` - 256-bit encryption key (hex string) - if using crypto module
- OR configure KMS key ARN if using AWS Encryption SDK

**Test:** Create user, verify encrypted data in DynamoDB, verify decryption works.

---

### 8. Add "My Trips" Menu and Functionality
**Problem:** No way to browse previously generated HTML plans.

**Files to create/modify:**
- `packages/web/src/pages/TripsPage.tsx` - new page
- `packages/web/src/components/trips/TripCard.tsx` - trip list item
- `packages/web/src/components/trips/TripDetail.tsx` - trip detail view
- `packages/web/src/App.tsx` - add route
- `packages/web/src/components/layout/Navigation.tsx` - new nav component
- `ios/PhotoScout/Views/TripsTab.swift` - update or create

**Solution:**

**Web Side:**
1. Create `TripsPage.tsx`:
   - Fetch plans from API: `GET /plans?limit=50`
   - Display in grid/list layout
   - Show: thumbnail (first map view or screenshot), city, date, spot count
   - Sort by: date (newest first), city (alphabetical)
   - Search/filter by city name
2. Create `TripCard.tsx`:
   - Thumbnail image (or placeholder)
   - City name
   - Created date (relative: "2 days ago")
   - Spot count badge
   - Tap to open detail view
3. Create `TripDetail.tsx`:
   - Full-screen HTML preview (using `HtmlPreview` component)
   - Back button
   - Share button
   - Delete button (with confirmation)
4. Update `App.tsx`:
   - Add route: `/trips` → `TripsPage`
   - Add route: `/trips/:planId` → `TripDetailPage`
5. Create `Navigation.tsx`:
   - Bottom tab bar (iOS-style) or sidebar (web-style)
   - Tabs: Home (chat), Trips, History, Profile
   - Active state indicators

**iOS Side:**
1. Already exists: `ios/PhotoScout/Views/PlansTab.swift`
2. Verify it loads HTML from S3 URLs (after implementing feature #3)
3. Update to use authenticated API calls

**Test:** Generate multiple plans, navigate to Trips page, verify list loads, tap to view detail, test delete.

---

### 9. Add "Chat History" Menu
**Problem:** No way to view past conversations.

**Files to create/modify:**
- `packages/web/src/pages/HistoryPage.tsx` - new page
- `packages/web/src/components/history/ConversationCard.tsx` - conversation list item
- `packages/web/src/App.tsx` - add route
- `ios/PhotoScout/Views/HistoryTab.swift` - verify/update

**Solution:**

**Web Side:**
1. Create `HistoryPage.tsx`:
   - Fetch conversations: `GET /conversations?limit=50`
   - Display in list layout
   - Show: title, last message preview, date, message count
   - Sort by: last message timestamp (newest first)
   - Search by content/city name
2. Create `ConversationCard.tsx`:
   - Conversation title (city name or first message)
   - Last message preview (truncated)
   - Date (relative)
   - Message count badge
   - Unread indicator (if applicable)
   - Tap to open conversation
3. Update `ConversationPage.tsx`:
   - Already exists, verify it works with authenticated API
   - Add back button to return to history
4. Update `App.tsx`:
   - Add route: `/history` → `HistoryPage`
   - Route already exists: `/conversation/:conversationId` → `ConversationPage`

**API Update:**
- Consider adding pagination (cursor-based)
- Add conversation search endpoint: `GET /conversations/search?q={query}`

**iOS Side:**
1. Already exists: `ios/PhotoScout/Views/HistoryTab.swift`
2. Verify it loads conversations correctly

**Test:** Have multiple conversations, navigate to History, verify list loads, tap to view conversation.

---

## 🟡 OPTIMIZATION (Priority 3)

### 10. Add DeepSeek Support for Dev Environment
**Problem:** Claude is expensive for testing. Need cheaper alternative for dev.

**Files to modify:**
- `infra/lib/photoscout-stack.ts` - add ENVIRONMENT variable
- `packages/api/src/lib/anthropic.ts` - refactor to support multiple providers
- `packages/api/src/lib/llm-factory.ts` - new file for provider selection
- `packages/api/src/lib/deepseek.ts` - new DeepSeek client
- `.env.example` - add new variables

**Solution:**

1. Create `llm-factory.ts`:
```typescript
export function getLLMClient() {
  const environment = process.env.ENVIRONMENT || 'production';
  
  if (environment === 'development' && process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekClient();
  }
  
  return new AnthropicClient();
}
```

2. Create `deepseek.ts`:
```typescript
import OpenAI from 'openai'; // DeepSeek uses OpenAI-compatible API

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function* streamDeepSeekResponse(
  messages: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const formattedMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  formattedMessages.push({
    role: 'user',
    content: userMessage,
  });

  const stream = await deepseek.chat.completions.create({
    model: 'deepseek-chat', // or 'deepseek-coder'
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...formattedMessages,
    ],
    stream: true,
    max_tokens: 8192,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
```

3. Refactor `anthropic.ts`:
   - Rename to `claude.ts`
   - Export `ClaudeClient` class with same interface as `DeepSeekClient`

4. Update `chat.ts` handler:
```typescript
import { getLLMClient } from '../lib/llm-factory';

const llm = getLLMClient();
for await (const chunk of llm.streamChat(history, message)) {
  // ... same logic
}
```

**Environment Variables:**
- `ENVIRONMENT` - "development" or "production"
- `DEEPSEEK_API_KEY` - DeepSeek API key (dev only)
- `ANTHROPIC_API_KEY` - Claude API key (prod)

**Config Management:**
1. Add to `.env.example`:
```
# Environment
ENVIRONMENT=development  # or production

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...  # optional, for dev only
```

2. Update CDK to read `ENVIRONMENT` from env vars
3. Add logic to use DeepSeek when `ENVIRONMENT=development`

**Cost Comparison:**
- Claude Sonnet 4: ~$3 per million input tokens, ~$15 per million output tokens
- DeepSeek: ~$0.14 per million input tokens, ~$0.28 per million output tokens
- **Savings: ~95% cheaper!**

**Note:** DeepSeek output quality may differ. Test thoroughly before using in production.

**Test:** Set `ENVIRONMENT=development`, verify DeepSeek is used, verify HTML generation works, compare output quality.

---

## 📋 IMPLEMENTATION ORDER

**Week 1: UX & Prompt Improvements (HIGHEST IMPACT)**
1. Add markdown rendering (Task #1) ⚡ **QUICK WIN**
2. Improve system prompt for multi-turn conversations (Task #4) ⚡ **SAVES TOKENS**
3. Fix HTML not displaying (Task #2)
4. Add two-tab layout (Task #3)

**Week 2: Infrastructure**
5. Save HTML to S3 (Task #5)
6. Add DeepSeek support for dev (Task #10) ⚡ **SAVES MONEY**

**Week 3: Authentication**
7. Add Google OAuth login (Task #6)
8. Store user data with encryption (Task #7)

**Week 4: User Features**
9. Add "My Trips" menu (Task #8)
10. Add "Chat History" menu (Task #9)

---

## 🧪 TESTING CHECKLIST

After each feature:
- [ ] Unit tests for new functions
- [ ] Integration tests for API endpoints
- [ ] Manual testing on iOS simulator
- [ ] Manual testing on web browser
- [ ] Test error cases and edge cases
- [ ] Verify backwards compatibility (if applicable)
- [ ] Update documentation

---

## 📦 DEPENDENCIES TO ADD

**iOS:**
```swift
// Add via Swift Package Manager in Xcode
- GoogleSignIn-iOS: https://github.com/google/GoogleSignIn-iOS
- KeychainAccess: https://github.com/kishikawakatsumi/KeychainAccess
```

**Backend:**
```json
// packages/api/package.json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x",
    "@aws-crypto/client-node": "^4.x",  // for encryption
    "google-auth-library": "^9.x",      // for Google token verification
    "openai": "^4.x"                     // for DeepSeek (OpenAI-compatible API)
  }
}
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **Authentication:**
   - Verify Google ID tokens on every request
   - Use short-lived tokens (1 hour)
   - Implement token refresh flow
   - Store refresh tokens encrypted in DynamoDB

2. **Authorization:**
   - Users can only access their own data
   - Check `userId` matches on all data access
   - Implement rate limiting (API Gateway throttling)

3. **Data Protection:**
   - Encrypt sensitive data at rest (refresh tokens)
   - Use HTTPS for all API calls
   - Store encryption keys in environment variables (or KMS)
   - Implement data retention policy (auto-delete old conversations)

4. **S3 Security:**
   - HTML plans: private (signed URLs) or public?
   - If public: use random UUIDs in paths to prevent enumeration
   - If private: generate signed CloudFront URLs (short-lived)
   - Consider: user-generated HTML could contain malicious scripts (sanitize?)

---

## 📝 NOTES

- Current API uses `visitorId` (anonymous). After auth, replace with `userId` (Google sub).
- Migration strategy: Keep `visitorId` support for backwards compatibility, map to `userId` after login.
- Consider adding analytics: track which cities are most popular, which spots users visit.
- Future: Add social features (share trips, follow photographers, discover popular spots).
- Future: Add offline support (cache plans in iOS app, sync when online).

---

## 🚀 DEPLOYMENT

After completing features:
1. Update iOS app version
2. Submit to TestFlight
3. Deploy backend via CDK: `npm run deploy`
4. Test in production environment
5. Monitor CloudWatch logs for errors
6. Gradual rollout: 10% → 50% → 100% (if using feature flags)

---

## 📧 QUESTIONS FOR VLADIMIR

- [ ] Google OAuth client ID ready? (need iOS bundle ID)
- [ ] Preferred encryption method: crypto module vs AWS Encryption SDK?
- [ ] Should HTML plans be public or private? (affects S3/CloudFront setup)
- [ ] Analytics requirements? (track which cities, error rates, etc.)
- [ ] Budget for API calls? (helps determine when to use DeepSeek vs Claude)

---

**Last Updated:** January 7, 2026
**Project:** PhotoScout
**Repository:** /Users/vladimir/projects/PhotoScout

