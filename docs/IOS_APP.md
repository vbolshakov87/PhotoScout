# PhotoScout iOS App

Native iOS application built with SwiftUI, featuring Google Sign-In and full offline support.

## Features

### ✅ Native UI
- **SwiftUI TabView** - Native bottom navigation
- **Native Lists** - Pull-to-refresh, swipe-to-delete
- **SF Symbols** - iOS system icons
- **Dark Mode** - Automatic theme support
- **Haptics** - Touch feedback

### ✅ Authentication
- **Google Sign-In** - Web-based OAuth 2.0
- **JWT Decoding** - Client-side token parsing
- **Persistent Sessions** - Survives app restarts
- **Profile Display** - User name and email
- **Secure Sign-Out** - With confirmation dialog

### ✅ Data Sync
- **Real-Time Updates** - Automatic refresh
- **Offline Cache** - UserDefaults storage
- **Error Handling** - Automatic retry
- **Progress Indicators** - Loading states

## Project Structure

```
ios/PhotoScout/
├── PhotoScout.xcodeproj     # Xcode project
├── PhotoScoutApp.swift       # App entry point with auth flow
├── Config.swift              # API configuration
├── MainTabView.swift         # Bottom tab navigation
├── Assets.xcassets/          # App icons and images
├── Services/
│   ├── APIService.swift              # REST API client
│   └── AuthenticationService.swift   # Google OAuth
├── Views/
│   ├── ChatTab.swift                 # Chat interface (WebView)
│   ├── PlansTab.swift                # Trip plans list
│   ├── HistoryTab.swift              # Conversation history
│   ├── GoogleSignInView.swift        # Sign-in screen
│   ├── PlanDetailView.swift          # Plan details
│   └── ConversationDetailView.swift  # Conversation details
├── Models/
│   ├── Plan.swift            # Plan data model
│   └── Conversation.swift    # Conversation data model
└── Components/
    ├── WebView.swift         # WKWebView wrapper
    ├── PlanRow.swift         # Plan list item
    └── ConversationRow.swift # Conversation list item
```

## Setup

### Prerequisites
- macOS 14+ with Xcode 15+
- iOS 26.2+ deployment target
- Apple Developer account (for device testing)

### Configuration

1. **Open Project**
   ```bash
   open ios/PhotoScout/PhotoScout.xcodeproj
   ```

2. **Update Config** (after backend deployment)
   ```bash
   cd ios
   ./update-config.sh
   ```

   This updates `Config.swift` with CloudFront URLs from `cdk-outputs.json`.

3. **Configure Google OAuth**

   Add to `Info.plist` via Xcode project settings:

   **Info.plist > URL Types > Add URL Type:**
   - **Identifier**: `com.vladimirbolshakov.PhotoScout`
   - **URL Schemes**: `com.vladimirbolshakov.PhotoScout`

### Build & Run

1. Select target device/simulator
2. Press ⌘R to build and run
3. App will show sign-in screen on first launch

## Architecture

### Authentication Flow

```
┌─────────────────┐
│  App Launch     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      No      ┌──────────────────┐
│ Authenticated?  │─────────────▶│ GoogleSignInView │
└────────┬────────┘               └────────┬─────────┘
         │ Yes                              │ Sign In
         │                                  ▼
         │                     ┌─────────────────────┐
         │                     │ Google OAuth Web    │
         │                     │ (WKWebView)         │
         │                     └──────────┬──────────┘
         │                                │ ID Token
         │                                ▼
         │                     ┌─────────────────────┐
         │                     │ Decode JWT          │
         │                     │ Store User Info     │
         │                     └──────────┬──────────┘
         │                                │
         └────────────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │    MainTabView      │
                              │  (Chat/Trips/History)│
                              └─────────────────────┘
```

### Data Flow

```
┌──────────────┐
│ View Layer   │ (SwiftUI Views)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Service Layer│ (APIService, AuthenticationService)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Network Layer│ (URLSession)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AWS Lambda   │ (via CloudFront)
└──────────────┘
```

## Components

### AuthenticationService

Manages Google Sign-In and user session:

```swift
@MainActor
class AuthenticationService: ObservableObject {
    static let shared = AuthenticationService()

    @Published var isAuthenticated = false
    @Published var userEmail: String?
    @Published var userId: String?
    @Published var userName: String?

    var visitorId: String {
        // Returns Google user ID when authenticated,
        // or device UUID otherwise
    }

    func signInWithGoogle(idToken: String) async throws
    func signOut()
}
```

### APIService

Handles all backend API calls:

```swift
class APIService {
    static let shared = APIService()

    func fetchPlans() async throws -> [Plan]
    func fetchPlan(id: String) async throws -> Plan
    func deletePlan(id: String) async throws

    func fetchConversations() async throws -> [Conversation]
    func fetchConversation(id: String) async throws -> ConversationDetail
}
```

### WebView Component

WKWebView wrapper with URL monitoring:

```swift
struct WebView: UIViewRepresentable {
    let url: URL
    var onURLChange: ((URL) -> Void)? = nil

    // Used for OAuth redirect detection and chat interface
}
```

## Google OAuth Configuration

### Client Credentials

**Client ID:**
```
216349065006-irv1sao34538tks3eq3a6rqgq2tb8ntn.apps.googleusercontent.com
```

**Redirect URI:**
```
com.vladimirbolshakov.PhotoScout:/oauth2redirect
```

### OAuth Flow

1. User taps "Sign in with Google"
2. App opens Google OAuth URL in WebView:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=<CLIENT_ID>
     &redirect_uri=<REDIRECT_URI>
     &response_type=id_token
     &scope=openid%20profile%20email
     &nonce=<RANDOM>
   ```

3. User authenticates with Google
4. Google redirects to: `com.vladimirbolshakov.PhotoScout:/oauth2redirect#id_token=...`
5. WebView detects redirect URL change
6. App extracts ID token from URL fragment
7. App decodes JWT to get user info (sub, email, name, picture)
8. User info stored in UserDefaults
9. `isAuthenticated` set to `true`
10. Navigate to MainTabView

### JWT Token Structure

```json
{
  "iss": "https://accounts.google.com",
  "sub": "105925737740615784679",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Tabs

### Chat Tab
- WebView loading CloudFront URL
- Full chat interface from web app
- Keyboard handling
- Pull-to-refresh

### Trips Tab (PlansTab)
- Native SwiftUI list
- Pull-to-refresh
- Swipe-to-delete
- Navigation to detail view
- Empty state with guidance
- Loading states

### History Tab
- Native SwiftUI list
- Pull-to-refresh
- Profile menu (top-left)
  - User name
  - User email
  - Sign out button
- Navigation to detail view
- Loading states

## Development

### Local Development

1. **Use Local API** (optional)

   Edit `Config.swift`:
   ```swift
   static let webAppURL = "http://localhost:5173"
   static let apiBaseURL = "http://localhost:5173/api"
   ```

2. **Run Web Dev Server**
   ```bash
   pnpm dev:web
   ```

3. **Run iOS App**
   - Build in Xcode (⌘R)
   - Simulator will proxy to localhost

### Debugging

**Enable Console Logs:**
```swift
// Add to AppDelegate or View
print("Debug: \(variable)")
```

**View Logs:**
- Xcode Console (⌘⇧C)
- Filter by tag/keyword

**Network Debugging:**
```swift
// In URLSession requests
print("Request: \(request.url?.absoluteString ?? "")")
print("Response: \(String(data: data, encoding: .utf8) ?? "")")
```

## Deployment

### TestFlight

See [TESTFLIGHT.md](../ios/TESTFLIGHT.md) for App Store Connect setup.

Quick steps:
1. Archive app (Product → Archive)
2. Distribute to App Store Connect
3. Submit for TestFlight review
4. Invite beta testers

### App Store

1. Complete TestFlight testing
2. Create App Store listing
3. Submit for review
4. Wait for approval (~24-48 hours)
5. Release to App Store

## Testing

### Manual Test Checklist

- [ ] Launch app → See sign-in screen
- [ ] Sign in with Google → Success
- [ ] View profile in History tab menu
- [ ] Create photo trip in Chat tab
- [ ] View plan in Trips tab
- [ ] Tap plan → See detail view
- [ ] Swipe to delete plan → Confirm deletion
- [ ] Pull to refresh → Data updates
- [ ] View conversation in History tab
- [ ] Sign out → Return to sign-in screen
- [ ] Restart app → Still authenticated
- [ ] Sign out and restart → See sign-in screen

### Common Issues

**Issue: Build fails with missing files**
```bash
# Solution: Clean build
# Xcode: Product → Clean Build Folder (⇧⌘K)
```

**Issue: OAuth redirect not working**
```
# Solution: Verify Info.plist URL scheme
1. Open PhotoScout.xcodeproj
2. Select PhotoScout target
3. Info tab → URL Types
4. Ensure "com.vladimirbolshakov.PhotoScout" is listed
```

**Issue: API calls fail**
```swift
// Solution: Check Config.swift URLs match deployment
// Run: cd ios && ./update-config.sh
```

**Issue: WebView blank**
```
# Solution: Check console for errors
# Enable Safari Web Inspector:
# Settings → Safari → Advanced → Web Inspector
```

## Performance

### Optimization Tips

1. **Lazy Loading**
   - Lists load data on appear
   - Images loaded asynchronously

2. **Caching**
   - UserDefaults for auth state
   - Memory cache for API responses

3. **Network**
   - CloudFront CDN for low latency
   - Compressed responses

4. **UI**
   - Native SwiftUI for 60fps
   - Hardware acceleration
   - Efficient list rendering

### Memory Management

```swift
// Use weak self in closures
Task { [weak self] in
    await self?.loadData()
}

// Cancel tasks on disappear
.task {
    await loadData()
}
.onDisappear {
    // Task auto-cancelled
}
```

## Security

### Best Practices

✅ **Implemented:**
- HTTPS only via CloudFront
- OAuth 2.0 for authentication
- JWT token validation
- Secure UserDefaults storage
- No API keys in code

❌ **Not Implemented:**
- Keychain storage (using UserDefaults)
- Certificate pinning
- Jailbreak detection
- Code obfuscation

### Data Storage

```swift
// Current: UserDefaults (not encrypted)
UserDefaults.standard.set(userId, forKey: "userId")

// Better: Keychain (encrypted)
// TODO: Migrate to Keychain for production
```

## Troubleshooting

### Build Errors

**"Cannot find 'AuthenticationService' in scope"**
- Open project.pbxproj
- Verify AuthenticationService.swift in compile sources

**"Missing entitlements"**
- Select PhotoScout target
- Signing & Capabilities tab
- Enable required capabilities

### Runtime Issues

**"Invalid OAuth redirect"**
- Check Info.plist URL scheme
- Verify Google Cloud Console redirect URI
- Ensure scheme matches bundle identifier

**"API returns 403"**
- Check CloudFront distribution
- Verify CORS configuration
- Check Lambda function logs

**"WebView doesn't load"**
- Check network inspector
- Verify CloudFront URL in Config.swift
- Test URL in Safari

## Next Steps

### Planned Features
- [ ] Keychain for secure token storage
- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] Offline mode with local database
- [ ] Push notifications
- [ ] Share extension
- [ ] Widget support
- [ ] Apple Sign In

### Code Improvements
- [ ] Add unit tests
- [ ] Add UI tests
- [ ] Implement error analytics
- [ ] Add crash reporting
- [ ] Improve error messages
- [ ] Add loading skeletons

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [WKWebView Guide](https://developer.apple.com/documentation/webkit/wkwebview)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Support

For iOS-specific issues:
- Check [GitHub Issues](https://github.com/yourusername/PhotoScout/issues)
- Email: vbolshakov87@gmail.com
