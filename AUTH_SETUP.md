# Google OAuth Authentication Setup

This guide explains how to set up Google OAuth authentication for both web and iOS apps.

## Web App Authentication

### 1. Get Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `PhotoScout Web`
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `https://yourdomain.com`
   - Click "Create"
   - **Copy the Client ID** (format: `xxx.apps.googleusercontent.com`)

### 2. Configure Web App

Create `/packages/web/.env`:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Test Web Authentication

```bash
cd packages/web
pnpm dev
```

Navigate to http://localhost:5173 - you'll see the login page with Google Sign-In button.

---

## iOS App Authentication

### 1. Get iOS OAuth Client ID

1. In Google Cloud Console, create **another** OAuth client ID:
   - Application type: **iOS**
   - Name: `PhotoScout iOS`
   - Bundle ID: `com.photoscout.app` (or your bundle ID)
   - Click "Create"
   - **Copy the iOS Client ID**

### 2. Configure iOS App

Add GoogleSignIn Swift package:

1. Open Xcode project
2. File → Add Package Dependencies
3. URL: `https://github.com/google/GoogleSignIn-iOS`
4. Version: 7.0.0 or later

### 3. Update Info.plist

Add URL scheme:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
    </array>
  </dict>
</array>
```

Replace `YOUR-CLIENT-ID` with the iOS client ID (reverse format).

### 4. Implement Google Sign-In (Swift)

Create `AuthService.swift`:

```swift
import GoogleSignIn

class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var idToken: String?

    func signIn() {
        guard let presentingVC = getRootViewController() else { return }

        GIDSignIn.sharedInstance.signIn(
            withPresenting: presentingVC
        ) { result, error in
            guard error == nil else { return }
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else { return }

            self.idToken = idToken
            self.isAuthenticated = true
        }
    }

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        self.isAuthenticated = false
        self.idToken = nil
    }
}
```

Create `LoginView.swift`:

```swift
import SwiftUI
import GoogleSignInSwift

struct LoginView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "camera")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("PhotoScout")
                .font(.largeTitle)
                .bold()

            Text("Plan your perfect photography trip with AI")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            GoogleSignInButton(action: {
                authService.signIn()
            })
            .frame(height: 50)
        }
        .padding()
    }
}
```

Update `PhotoScoutApp.swift`:

```swift
import SwiftUI
import GoogleSignIn

@main
struct PhotoScoutApp: App {
    @StateObject private var authService = AuthService()

    var body: some Scene {
        WindowGroup {
            if authService.isAuthenticated, let idToken = authService.idToken {
                ContentView(idToken: idToken)
                    .environmentObject(authService)
            } else {
                LoginView()
                    .environmentObject(authService)
            }
        }
    }
}
```

Update `ContentView.swift` to pass ID token to WebView:

```swift
struct ContentView: View {
    let idToken: String
    @EnvironmentObject var authService: AuthService

    var body: some View {
        WebView(idToken: idToken)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") {
                        authService.signOut()
                    }
                }
            }
    }
}
```

Update `WebView.swift` to inject ID token:

```swift
struct WebView: UIViewRepresentable {
    let idToken: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()

        // Inject ID token via JavaScript
        let script = """
        localStorage.setItem('photoscout_id_token', '\(idToken)');
        """
        let userScript = WKUserScript(
            source: script,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(userScript)

        // Load web app
        if let url = URL(string: "https://yourdomain.com") {
            webView.load(URLRequest(url: url))
        }

        return webView
    }
}
```

---

## Backend Authentication (Lambda)

The backend already supports authentication via the `Authorization: Bearer <token>` header.

### How it works:

1. **Web App**:
   - User signs in with Google
   - ID token stored in `localStorage`
   - All API calls include `Authorization: Bearer <token>` header
   - Backend verifies token and extracts userId

2. **iOS App**:
   - User signs in with Google natively
   - ID token injected into WebView
   - Web app uses the token for API calls

### Backend verification:

The Lambda handler at `packages/api/src/lib/auth.ts` provides:

```typescript
export async function verifyGoogleToken(idToken: string): Promise<{
  userId: string;
  email: string;
  name: string;
  picture?: string;
}>
```

This function:
- Verifies the token signature with Google
- Extracts user info (userId, email, name, picture)
- Returns verified user data

---

## Testing

### Test Web Authentication

1. Start dev server: `pnpm --filter @photoscout/web dev`
2. Open http://localhost:5173
3. Click "Sign in with Google"
4. After login, you'll be redirected to the chat page
5. Your profile picture appears in the top-right
6. Click it to see user menu with logout

### Test iOS Authentication

1. Run the iOS app in Xcode
2. Tap "Sign in with Google"
3. Complete Google OAuth flow
4. App loads with WebView showing chat interface
5. User is automatically authenticated

---

## Environment Variables

### Web App (.env)
```bash
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### Lambda (.env)
```bash
# Already configured in backend
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

---

## Security Notes

1. **Web and iOS use different Client IDs** - This is Google's recommended practice
2. **ID tokens expire after 1 hour** - The app checks expiration on load
3. **Tokens stored in localStorage** - Cleared on logout
4. **Backend validates every request** - Uses `google-auth-library` for verification
5. **User data encrypted** - Refresh tokens (if needed) are AES-256-GCM encrypted

---

## Troubleshooting

### "Missing VITE_GOOGLE_CLIENT_ID" error
- Create `.env` file in `packages/web/`
- Add `VITE_GOOGLE_CLIENT_ID=...`
- Restart dev server

### Google Sign-In popup blocked
- Allow popups for localhost in browser settings
- Or use redirect flow instead of popup

### Token expired on page reload
- Token expiration is checked on app load
- User will be redirected to login page
- This is expected behavior after 1 hour

### iOS app not signing in
- Check Bundle ID matches Google Console
- Verify URL scheme in Info.plist
- Ensure GoogleSignIn package is installed

---

## Next Steps

After authentication is working:

1. Deploy to production
2. Update Google Console with production domain
3. Test end-to-end authentication flow
4. Monitor user signups in DynamoDB Users table
