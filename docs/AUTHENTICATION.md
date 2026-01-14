# Authentication Setup

AI Scout uses Google OAuth 2.0 for user authentication in the iOS app.

## Overview

- **Web App**: Anonymous usage with device-specific visitorId
- **iOS App**: Google Sign-In required, uses Google user ID as visitorId
- **Backend**: Accepts any visitorId (string identifier)

## Google Cloud Configuration

### 1. Create OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Sign-In API**
4. Navigate to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**

### 2. Configure OAuth Client

**Application type**: Web application

**Authorized redirect URIs**:
```
com.vladimirbolshakov.PhotoScout:/oauth2redirect
```

**Note**: This is a custom URL scheme, not a web URL.

### 3. Get Credentials

After creation, note your:
- **Client ID**: `216349065006-irv1sao34538tks3eq3a6rqgq2tb8ntn.apps.googleusercontent.com`
- **Client Secret**: (not needed for mobile OAuth)

## iOS Configuration

### Update Bundle Identifier

If using a different bundle ID, update these files:

1. **Xcode Project Settings**
   - Select PhotoScout target
   - General tab → Bundle Identifier
   - Update to: `com.yourdomain.PhotoScout`

2. **AuthenticationService.swift**
   ```swift
   // Update clientId
   private let clientId = "YOUR_CLIENT_ID.apps.googleusercontent.com"
   ```

3. **GoogleSignInView.swift**
   ```swift
   // Update redirect URI
   let redirectURI = "com.yourdomain.PhotoScout:/oauth2redirect"
   ```

4. **Info.plist**
   - Update URL scheme to match bundle ID

### Configure URL Scheme

**Via Xcode UI:**
1. Select PhotoScout target
2. Info tab
3. URL Types section
4. Add URL Type:
   - **Identifier**: `com.vladimirbolshakov.PhotoScout`
   - **URL Schemes**: `com.vladimirbolshakov.PhotoScout`

**Via Info.plist:**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.vladimirbolshakov.PhotoScout</string>
        </array>
    </dict>
</array>
```

## Authentication Flow

### High-Level Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│   App   │────1───▶│ Google  │────2───▶│   App   │
│         │◀───3────│  OAuth  │         │         │
└─────────┘         └─────────┘         └─────────┘
    │                                        │
    └────────────────4──────────────────────┘
                 (Store Token)
```

### Detailed Steps

1. **User Taps "Sign in with Google"**
   ```swift
   GoogleSignInView → shows full-screen modal
   ```

2. **App Opens OAuth URL**
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=216349065006-irv1sao34538tks3eq3a6rqgq2tb8ntn.apps.googleusercontent.com
     &redirect_uri=com.vladimirbolshakov.PhotoScout:/oauth2redirect
     &response_type=id_token
     &scope=openid%20profile%20email
     &nonce=<random-uuid>
   ```

3. **User Authenticates with Google**
   - Enters credentials
   - Grants permissions
   - Google redirects back to app

4. **App Receives Redirect**
   ```
   com.vladimirbolshakov.PhotoScout:/oauth2redirect
     #id_token=eyJhbGciOiJSUzI1NiIs...
   ```

5. **WebView Detects URL Change**
   ```swift
   func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) {
       if url.absoluteString.starts(with: "com.vladimirbolshakov.PhotoScout:/oauth2redirect") {
           // Extract token from fragment
           handleOAuthRedirect(url)
       }
   }
   ```

6. **Extract ID Token from URL**
   ```swift
   let fragment = url.fragment // "id_token=..."
   let idToken = extractToken(from: fragment)
   ```

7. **Decode JWT Token**
   ```swift
   func decodeJWT(idToken: String) throws -> [String: Any] {
       let segments = idToken.components(separatedBy: ".")
       let payloadSegment = segments[1]
       let data = Data(base64Encoded: payloadSegment)
       return JSONSerialization.jsonObject(with: data)
   }
   ```

8. **Extract User Info**
   ```swift
   let payload = try decodeJWT(idToken: idToken)
   self.userId = payload["sub"]           // "105925737740615784679"
   self.userEmail = payload["email"]      // "user@example.com"
   self.userName = payload["name"]        // "John Doe"
   self.userPhotoURL = payload["picture"] // "https://..."
   ```

9. **Store User Info**
   ```swift
   UserDefaults.standard.set(userId, forKey: "userId")
   UserDefaults.standard.set(userEmail, forKey: "userEmail")
   UserDefaults.standard.set(userName, forKey: "userName")
   self.isAuthenticated = true
   ```

10. **Navigate to Main App**
    ```swift
    // PhotoScoutApp.swift automatically shows MainTabView
    // when isAuthenticated = true
    ```

## JWT Token Structure

### Header
```json
{
  "alg": "RS256",
  "kid": "4ba6efef5e17214997...",
  "typ": "JWT"
}
```

### Payload
```json
{
  "iss": "https://accounts.google.com",
  "azp": "216349065006-irv1sao34538tks3eq3a6rqgq2tb8ntn.apps.googleusercontent.com",
  "aud": "216349065006-irv1sao34538tks3eq3a6rqgq2tb8ntn.apps.googleusercontent.com",
  "sub": "105925737740615784679",
  "email": "vbolshakov87@gmail.com",
  "email_verified": true,
  "nbf": 1767885389,
  "name": "Vladimir Bolshakov",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "given_name": "Vladimir",
  "family_name": "Bolshakov",
  "iat": 1767885689,
  "exp": 1767889289,
  "jti": "fb125dbba5fb887fa4e22cb927c8a031b337d101"
}
```

### Important Claims
- **sub**: User's unique Google ID (used as visitorId)
- **email**: User's email address
- **name**: Full name
- **picture**: Profile photo URL
- **exp**: Token expiration (1 hour from issuance)

## Data Storage

### UserDefaults Keys

```swift
// Authentication
"userId"           // Google user ID (sub)
"userEmail"        // User email
"userName"         // User full name
"userPhotoURL"     // Profile picture URL

// Fallback
"deviceVisitorId"  // UUID for non-authenticated users
```

### Security Considerations

**Current: UserDefaults (not encrypted)**
- ✅ Simple implementation
- ✅ Survives app restarts
- ❌ Not encrypted at rest
- ❌ Accessible to jailbroken devices

**Recommended: Keychain**
```swift
// TODO: Migrate to Keychain for production
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "userId",
    kSecValueData as String: userId.data(using: .utf8)!
]
SecItemAdd(query as CFDictionary, nil)
```

## Sign Out

### Process

1. User taps profile icon in History tab
2. Selects "Sign Out" from menu
3. Confirmation alert appears
4. On confirm:
   ```swift
   func signOut() {
       self.isAuthenticated = false
       self.userId = nil
       self.userEmail = nil
       self.userName = nil
       self.userPhotoURL = nil

       UserDefaults.standard.removeObject(forKey: "userId")
       UserDefaults.standard.removeObject(forKey: "userEmail")
       UserDefaults.standard.removeObject(forKey: "userName")
       UserDefaults.standard.removeObject(forKey: "userPhotoURL")
   }
   ```

5. App automatically shows GoogleSignInView

### Notes

- Does not revoke token with Google
- Local sign-out only
- User data remains in backend (by visitorId)

## Backend Integration

### API Service Updates

```swift
class APIService {
    private var visitorId: String {
        // Use authenticated Google ID or device UUID
        return AuthenticationService.shared.visitorId
    }

    func fetchPlans() async throws -> [Plan] {
        let url = "\(baseURL)/plans?visitorId=\(visitorId)"
        // ...
    }
}
```

### Lambda Functions

No backend changes required:
- Already accepts any `visitorId` string
- Google ID format: `"105925737740615784679"`
- Device UUID format: `"550e8400-e29b-41d4-a716-446655440000"`

## Testing

### Test with Different Accounts

1. Sign out
2. Sign in with different Google account
3. Verify new visitorId is used
4. Check that data is separate

### Test Persistence

1. Sign in
2. Close app
3. Reopen app
4. Verify still signed in

### Test Sign Out

1. Sign in
2. Create some data
3. Sign out
4. Sign in with same account
5. Verify data still accessible

## Troubleshooting

### "Redirect URI mismatch"

**Error:**
```
Error 400: redirect_uri_mismatch
```

**Solution:**
1. Check Google Cloud Console → Credentials
2. Verify redirect URI matches exactly:
   ```
   com.vladimirbolshakov.PhotoScout:/oauth2redirect
   ```
3. Ensure no trailing slash
4. Ensure scheme matches bundle ID

### "Invalid ID token"

**Error:**
```
AuthError.invalidToken
```

**Solution:**
1. Check token not expired (1 hour lifetime)
2. Verify base64 decoding is correct
3. Add padding if needed: `"=".repeat(4 - remainder)`
4. Check JSON parsing

### "WebView doesn't redirect"

**Solution:**
1. Check Info.plist URL scheme
2. Verify scheme in GoogleSignInView matches
3. Enable Safari Web Inspector to debug
4. Check console for JavaScript errors

### "Token validation fails"

**Solution:**
1. Don't validate signature (not needed for mobile)
2. Just decode and extract claims
3. Check `iss` is `https://accounts.google.com`
4. Check `aud` matches your client ID

## Production Checklist

- [ ] Create production OAuth client in Google Cloud
- [ ] Update client ID in code
- [ ] Update bundle identifier
- [ ] Update URL scheme
- [ ] Test with multiple accounts
- [ ] Test sign out/sign in flow
- [ ] Test token expiration
- [ ] Migrate to Keychain storage
- [ ] Add error analytics
- [ ] Add crash reporting

## Alternative: Apple Sign In

For App Store requirements, consider adding Apple Sign In:

```swift
import AuthenticationServices

struct AppleSignInButton: View {
    var body: some View {
        SignInWithAppleButton { request in
            request.requestedScopes = [.fullName, .email]
        } onCompletion: { result in
            switch result {
            case .success(let auth):
                // Handle Apple ID credential
                break
            case .failure(let error):
                // Handle error
                break
            }
        }
    }
}
```

## Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios)
- [JWT.io - Token Decoder](https://jwt.io)
- [Apple Sign In Documentation](https://developer.apple.com/documentation/sign_in_with_apple)

## Support

For authentication issues:
- Check Google Cloud Console logs
- Enable Safari Web Inspector
- View Xcode console logs
- Email: vbolshakov87@gmail.com
