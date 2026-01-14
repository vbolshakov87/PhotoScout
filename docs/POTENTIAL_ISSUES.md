# PhotoScout Project Review - Potential Issues

> Last updated: 2026-01-15

## 1. Unused Dependencies

| Item | Status |
|------|--------|
| `clsx` | ✅ Removed |
| `class-variance-authority` | ✅ Removed |

---

## 2. Dead Code / Unused Exports

| Item | Location | Status |
|------|----------|--------|
| `hasAllParams()` | `packages/api/src/lib/plan-params.ts` | ✅ Removed |
| 5 Request types | `packages/shared/src/types.ts:78-103` | ⏳ Pending |
| `ApiResponse<T>` | `packages/shared/src/types.ts:65` | ⏳ Pending |
| 5 API functions | `packages/web/src/lib/api.ts:80-131` | 🔒 Kept for future use |
| `openPlan`, `openConversation`, `navigateToTab` | NativeBridge interface | ⏳ Pending |

---

## 3. Security Issues

### Critical

| Issue | Location | Status |
|-------|----------|--------|
| **Missing OAuth audience validation** | `api/src/lib/auth.ts:27` | ✅ Fixed |
| **No authentication on endpoints** | All handlers | ⏳ Pending |
| **Unprotected admin endpoint** | `api/src/handlers/images.ts:82-91` | ✅ Fixed (requires `X-Admin-Key` header) |
| **No limit validation** | `conversations.ts:42`, `plans.ts:38` | ✅ Fixed (1-100 bounds) |
| **Unsafe cursor parsing** | `api/src/lib/dynamo.ts:31-44` | ✅ Fixed (`parseCursor()` with validation) |
| **No rate limiting** | All handlers | ⏳ Pending |

### CORS Configuration

| Status | Details |
|--------|---------|
| ✅ Fixed | Created `api/src/lib/cors.ts` with environment-based origin control |

Allowed origins:
- `https://aiscout.photo`
- `https://www.aiscout.photo`
- `http://localhost:*` (any port for development)

### New Environment Variables Required

```bash
GOOGLE_CLIENT_ID=your-google-client-id  # For OAuth validation
ADMIN_API_KEY=your-secret-key           # For admin endpoint protection
```

---

## 4. Performance Issues

### React

| Issue | Location | Status |
|-------|----------|--------|
| `MessageBubble` re-renders | `web/src/components/chat/MessageBubble.tsx` | ✅ Fixed (`React.memo()`) |
| Expensive string ops in render | `MessageBubble.tsx` | ⏳ Pending (move to `useMemo`) |
| Scroll effect too frequent | `web/src/components/chat/Chat.tsx:38-43` | ⏳ Pending |
| localStorage full rewrite | `web/src/hooks/useChat.ts:31-35` | ⏳ Pending |

### API

| Issue | Location | Status |
|-------|----------|--------|
| Loads 20 messages every chat | `api/src/handlers/chat.ts:56` | 🔒 Low priority (acceptable for launch) |
| Fire-and-forget cache updates | `api/src/lib/dynamo.ts:311-318` | ⏳ Pending |
| Unused cache implementation | `api/src/handlers/chat.ts` | ⏳ Pending |

---

## 5. Inconsistent Patterns

| Pattern | Status |
|---------|--------|
| Async style (`.then()` vs `async/await`) | ⏳ Pending |
| Error handling inconsistency | ⏳ Pending |
| API response shapes | ⏳ Pending |
| Import style | ⏳ Pending |

---

## 6. Missing Error Handling

### Critical

| Issue | Status |
|-------|--------|
| No React ErrorBoundary | ✅ Fixed (`components/shared/ErrorBoundary.tsx`) |
| `ConversationPage.tsx` missing error state | ✅ Fixed (added error state + UI) |
| `response.json()` calls lack try/catch | ⏳ Pending |

### Silent Failures

| Location | Status |
|----------|--------|
| `TripsPage.tsx:63` - city image fetch | ✅ Fixed (logs warning) |
| `useNativeBridge.ts:19,30` - share/clipboard | ✅ Fixed (logs warning) |

---

## 7. Missing Tests

| File | Priority | Status |
|------|----------|--------|
| `auth.ts` | CRITICAL | ⏳ Pending |
| `dynamo.ts` | CRITICAL | ⏳ Pending |
| `encryption.ts` | CRITICAL | ⏳ Pending |
| `plan-params.ts` | HIGH | ⏳ Pending |
| `chat.ts` handler | HIGH | ⏳ Pending |
| `AuthContext.tsx` | MEDIUM | ⏳ Pending |

---

## Summary

### Completed ✅

1. **Security**
   - OAuth audience validation enabled
   - Admin endpoint protected with API key
   - Input validation (limit bounds 1-100)
   - Cursor validation with safe parsing
   - Environment-based CORS (localhost + production)

2. **Reliability**
   - React ErrorBoundary added to App.tsx
   - MessageBubble wrapped with React.memo()
   - ConversationPage error state + UI
   - Silent failures now logged (TripsPage, useNativeBridge)

3. **Cleanup**
   - Removed unused dependencies (clsx, class-variance-authority)
   - Removed unused `hasAllParams()` function

### Remaining ⏳

1. **Security**
   - Implement authentication on all data endpoints
   - Add rate limiting

2. **Performance**
   - Optimize scroll effect dependencies
   - Fix localStorage full rewrite pattern

3. **Error Handling**
   - Add try/catch to response.json() calls

4. **Code Quality**
   - Remove unused types from shared package
   - Standardize async patterns
   - Add unit tests for critical files

5. **Dead Code**
   - Remove unused NativeBridge methods (or implement them)
   - Remove unused types from shared/types.ts
