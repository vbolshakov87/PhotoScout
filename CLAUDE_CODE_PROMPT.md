# PhotoScout - Claude Code Task List

Hi! I'm working on PhotoScout, a photography trip planning app. Here's what needs to be done:

## 🔴 CRITICAL (Do First - Quick Wins!)

### 1. Add Markdown Rendering Support ⚡ **QUICK WIN**
**Issue:** LLM uses markdown formatting (bold, lists) but it's displayed as plain text.

**Fix:**
```bash
cd packages/web
npm install react-markdown remark-gfm @tailwindcss/typography
```

Update `MessageBubble.tsx`:
- Add `react-markdown` component for assistant messages
- Detect markdown: check for `**`, `\n- `, `\n1. ` patterns
- Style with `prose prose-invert` classes
- Keep plain text for user messages

**Impact:** Makes LLM questions much easier to read! See screenshot example.

---

### 2. Improve System Prompt (Multi-Turn Conversations) ⚡ **SAVES TOKENS**
**Issue:** Need to ensure LLM asks clarifying questions BEFORE generating expensive HTML.

**Fix in `packages/api/src/lib/prompts.ts`:**
```typescript
## CRITICAL: Two-Phase Conversation Flow

### Phase 1: Clarifying Questions (REQUIRED)
**ALWAYS start by asking clarifying questions. Do NOT generate HTML immediately.**

Use markdown formatting for clarity:
- **Bold** for emphasis
- Numbered lists for questions

Essential questions:
1. **Exact duration:** 3 days or 4 days?
2. **Base location preference:** Specific region or full circuit?
3. **Transportation:** Rental car? Comfort with rough roads?
4. **Photography priorities:** Postcard shots, dramatic weather, golden/blue hour?
5. **Equipment:** Tripod? ND filters?

### Phase 2: HTML Generation (ONLY after questions are answered)
Generate complete HTML with NO explanatory text outside HTML.

## Important Rules
- **NEVER generate HTML in first response** - always ask questions first
- Use markdown for questions (easier to read)
- Only generate HTML after sufficient details

## Token Efficiency
By asking questions first, we:
- Avoid generating incorrect HTML that needs regeneration (saves ~4000 tokens)
- Get better information → better plans
- More personalized experience
```

**Impact:** Saves ~$0.06 per conversation (4000 tokens × $15/M) + better UX!

---

### 3. Fix HTML Preview Not Showing
**Issue:** LLM outputs text like "PhotoScout Trip Plan" before `<html>` tag, breaking the HTML preview.

**Fix:**
- Update HTML extraction in `packages/web/src/components/shared/HtmlPreview.tsx`
- Extract only HTML content (from `<!DOCTYPE html>` or `<html>` onwards)
- Display any prefix text separately above the preview
- Update detection logic in `useChat.ts` and `MessageBubble.tsx`

---

### 4. Add Two-Tab Layout
**Need:** Show 2 tabs in web view: (1) Chat, (2) HTML Preview

**Implementation:**
- Create `TabbedView.tsx` component with bottom tab bar (iOS-style)
- Tab 1: Chat interface (existing)
- Tab 2: Full-screen HTML preview (show only when HTML is available)
- Persist active tab in localStorage
- Add badge on Preview tab when new HTML generated

## 🟠 NEW FEATURES

### 5. Save HTML to S3 (Not DynamoDB)
**Why:** DynamoDB has 400KB limit, S3 is better for large HTML files

**Tasks:**
- Add S3 bucket in `infra/lib/photoscout-stack.ts`
- Upload HTML to S3: `${visitorId}/${planId}.html`
- Store CloudFront URL in DynamoDB (replace `htmlContent` field)
- Add S3 write permissions to Lambda
- Add dependency: `@aws-sdk/client-s3`

### 6. Add Google OAuth Login (Native iOS)
**Implementation:**

**iOS:**
- Add GoogleSignIn-iOS via Swift Package Manager
- Create `AuthService.swift` (handle sign-in, store token in Keychain)
- Create `LoginView.swift` (Google Sign-In button)
- Update `PhotoScoutApp.swift` (show LoginView if not authenticated)
- Pass ID token to WebView via JS bridge

**Backend:**
- Create auth middleware: verify Google ID token
- Replace `visitorId` with `userId` (Google sub)
- Add dependency: `google-auth-library`

**Security:**
- Verify tokens on every request
- Use Keychain for token storage (add KeychainAccess library)

### 7. Store User Data with Encryption
**Tasks:**
- Create Users table in DynamoDB (userId, email, name, encryptedRefreshToken)
- Create `packages/api/src/lib/encryption.ts` (AES-256 encryption utilities)
- Use either: `crypto` module or `@aws-crypto/client-node` (AWS Encryption SDK)
- Store encryption key in environment variable: `ENCRYPTION_KEY`
- Update auth middleware to create/update user records

**User Schema:**
```typescript
{
  userId: string;          // PK - Google sub
  email: string;
  name: string;
  profilePicture?: string;
  encryptedRefreshToken?: string; // encrypted
  createdAt: number;
  lastLoginAt: number;
}
```

### 8. Add "My Trips" Menu
**Tasks:**
- Create `TripsPage.tsx` (list all plans)
- Create `TripCard.tsx` (thumbnail, city, date, spot count)
- Create `TripDetail.tsx` (full-screen preview, share, delete)
- Add routes: `/trips`, `/trips/:planId`
- Add navigation component (bottom tab bar: Home, Trips, History)

### 9. Add "Chat History" Menu
**Tasks:**
- Create `HistoryPage.tsx` (list all conversations)
- Create `ConversationCard.tsx` (title, preview, date)
- Add route: `/history`
- Add search/filter by city name

## 🟡 OPTIMIZATION

### 10. Add DeepSeek Support (Dev Environment) ⚡ **SAVES MONEY**
**Why:** Claude is expensive (~$15/M output tokens), DeepSeek is 95% cheaper (~$0.28/M)

**Implementation:**
- Create `llm-factory.ts` (select provider based on ENVIRONMENT)
- Create `deepseek.ts` (use OpenAI-compatible API)
- Add env vars: `ENVIRONMENT=development`, `DEEPSEEK_API_KEY`
- Use DeepSeek only in development, Claude in production
- Add dependency: `openai` (for DeepSeek)

**Code Example:**
```typescript
// llm-factory.ts
export function getLLMClient() {
  const env = process.env.ENVIRONMENT || 'production';
  return (env === 'development' && process.env.DEEPSEEK_API_KEY) 
    ? new DeepSeekClient() 
    : new ClaudeClient();
}
```

---

## 📦 Dependencies to Install

**Frontend (npm) - INSTALL FIRST:**
```bash
cd packages/web
npm install react-markdown remark-gfm
npm install -D @tailwindcss/typography
```

**Backend (npm):**
```bash
cd packages/api
npm install @aws-sdk/client-s3 google-auth-library @aws-crypto/client-node openai
```

**iOS (Swift Package Manager):**
- `https://github.com/google/GoogleSignIn-iOS`
- `https://github.com/kishikawakatsumi/KeychainAccess`

---

## 🎯 Implementation Order (UPDATED - Start with Quick Wins!)

**Week 1: UX & Prompt Improvements (HIGHEST ROI)**
1. Add markdown rendering ⚡ **15 min task, huge UX improvement**
2. Improve system prompt ⚡ **Saves ~$0.06/conversation + better UX**
3. Fix HTML preview bug
4. Add two-tab layout

**Week 2: Infrastructure**
5. Save HTML to S3
6. Add DeepSeek support ⚡ **95% cost savings for dev/testing**

**Week 3: Authentication**
7. Add Google OAuth
8. Store user data with encryption

**Week 4: User Features**
9. Add My Trips menu
10. Add Chat History menu

---

## 📝 Key Points

- Replace `visitorId` with authenticated `userId` after implementing auth
- Encrypt sensitive data (refresh tokens) before storing
- S3 HTML paths: `${userId}/${planId}.html` (use userId after auth)
- Use CloudFront to serve HTML files
- Test on iOS simulator after each major change

---

## 🔐 Security

- Verify Google ID tokens on every API request
- Users can only access their own data (check userId)
- Store encryption key in environment variable
- Use HTTPS for all API calls
- Implement rate limiting

---

## Current Architecture

**Frontend:** React + TypeScript (Vite)
**iOS:** Swift + SwiftUI (WebView)
**Backend:** AWS Lambda (Node.js) + DynamoDB
**Infra:** AWS CDK (TypeScript)
**LLM:** Claude Sonnet 4 (streaming)

**File Structure:**
```
PhotoScout/
├── packages/
│   ├── web/         # React web app
│   ├── api/         # Lambda handlers
│   └── shared/      # Shared types
├── ios/             # iOS Swift app
└── infra/           # AWS CDK infrastructure
```

---

## 💡 Why Start with Tasks #1 and #2?

### Task #1: Markdown Rendering (15 min task)
**Current State:** Your screenshot shows the LLM output as plain text - all the `**bold**` and list formatting is lost.

**After Fix:** 
- Questions will be properly formatted
- Much easier to read and respond to
- Better user experience
- Minimal effort, maximum impact

### Task #2: Improved Prompt (Token Savings)
**Current State:** LLM already asks questions (good!), but prompt doesn't emphasize this strongly enough.

**After Fix:**
- Guarantees multi-turn conversation before HTML generation
- Prevents accidental HTML generation on vague requests
- **Saves ~4,000 tokens per conversation** (~$0.06)
- If you have 1000 conversations: **saves $60**
- Better results (more personalized plans)

**Example Token Cost:**
- Vague request → immediate HTML → wrong details → regenerate = **8,000 tokens** ($0.12)
- Vague request → ask questions → HTML with correct details = **4,500 tokens** ($0.07)
- **Savings: 44% per conversation!**

---

## 📊 Cost Breakdown (Why This Matters)

**Current cost per HTML generation:**
- Input: ~500 tokens × $3/M = $0.0015
- Output: ~4,000 tokens × $15/M = $0.06
- **Total: ~$0.0615 per plan**

**If you generate 1000 plans:**
- Claude (prod): $61.50
- DeepSeek (dev): $1.12 (Task #10)
- **Savings: $60.38 (98%)**

**With improved prompt (Task #2):**
- Reduces regenerations from ~30% → ~5%
- Saves: 250 unnecessary HTML generations × $0.06 = **$15**

**Combined savings potential: ~$75 per 1000 plans**

---

For detailed implementation notes, see `CLAUDE_CODE_TODO.md`.

