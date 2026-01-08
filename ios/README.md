# PhotoScout iOS App

Native iOS application for AI-powered photo trip planning.

## Quick Start

```bash
# Open in Xcode
open ios/PhotoScout/PhotoScout.xcodeproj

# After deploying backend, update config
cd ios && ./update-config.sh

# Build and run (⌘R in Xcode)
```

## Features

- ✅ Native SwiftUI interface
- ✅ Google Sign-In authentication
- ✅ Real-time AI chat
- ✅ Photo trip plan management
- ✅ Conversation history
- ✅ Pull-to-refresh & swipe-to-delete
- ✅ Offline-ready architecture

## Documentation

See [../docs/IOS_APP.md](../docs/IOS_APP.md) for:
- Detailed architecture
- Authentication setup
- Development guide
- Testing procedures
- Deployment instructions

## Project Structure

```
PhotoScout/
├── PhotoScout.xcodeproj
├── PhotoScoutApp.swift       # App entry point
├── Config.swift              # API configuration
├── MainTabView.swift         # Tab navigation
├── Services/
│   ├── APIService.swift
│   └── AuthenticationService.swift
├── Views/
│   ├── ChatTab.swift
│   ├── PlansTab.swift
│   ├── HistoryTab.swift
│   └── GoogleSignInView.swift
├── Models/
│   ├── Plan.swift
│   └── Conversation.swift
└── Components/
    ├── WebView.swift
    ├── PlanRow.swift
    └── ConversationRow.swift
```

## Requirements

- Xcode 15+
- iOS 26.2+
- macOS 14+
- Apple Developer account (for device testing)

## Configuration

### Update API URLs

After deploying the backend:

```bash
cd ios
./update-config.sh
```

This reads `../cdk-outputs.json` and updates `Config.swift`.

### Manual Configuration

Edit `Config.swift`:

```swift
struct Config {
    static let webAppURL = "https://YOUR_CLOUDFRONT_URL"
    static let apiBaseURL = "https://YOUR_CLOUDFRONT_URL/api"
}
```

## Authentication

The app uses Google OAuth 2.0. See [../docs/AUTHENTICATION.md](../docs/AUTHENTICATION.md) for setup.

**Client ID**: Already configured in code
**Redirect URI**: `com.vladimirbolshakov.PhotoScout:/oauth2redirect`

## Development

### Local Development

1. Start web dev server:
   ```bash
   pnpm dev:web
   ```

2. Update Config.swift:
   ```swift
   static let webAppURL = "http://localhost:5173"
   static let apiBaseURL = "http://localhost:5173/api"
   ```

3. Build and run in Xcode

### Debugging

- View logs: Xcode Console (⌘⇧C)
- Enable web inspector: Safari → Develop → Simulator
- Network debugging: Charles Proxy or Proxyman

## Testing

### Manual Test Flow

1. Launch → Sign in with Google
2. Create photo trip plan
3. View in Trips tab
4. Check History tab
5. Sign out → Sign back in
6. Verify data persistence

See [../docs/IOS_APP.md#testing](../docs/IOS_APP.md#testing) for detailed checklist.

## Deployment

### TestFlight

See [TESTFLIGHT.md](TESTFLIGHT.md) for:
- App Store Connect setup
- Build archiving
- Beta testing

### App Store

1. Complete TestFlight testing
2. Create App Store listing
3. Submit for review
4. Release

## Troubleshooting

### Build Fails

```bash
# Clean build folder
# Xcode: Product → Clean Build Folder (⇧⌘K)
```

### OAuth Not Working

1. Check Info.plist URL scheme
2. Verify Google Cloud Console redirect URI
3. Ensure scheme matches bundle identifier

### API Calls Fail

```bash
# Update configuration
cd ios && ./update-config.sh

# Verify URLs in Config.swift
```

## Support

- Documentation: [../docs/](../docs/)
- Issues: [GitHub Issues](https://github.com/yourusername/PhotoScout/issues)
- Email: vbolshakov87@gmail.com

---

**Build Status**: ✅ Builds Successfully

**Last Updated**: January 2026
