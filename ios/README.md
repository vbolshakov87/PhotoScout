# PhotoScout iOS App

Native iOS wrapper for PhotoScout.

## Project Structure

```
ios/
├── PhotoScout/              # Xcode project - edit Swift files here
│   ├── PhotoScout.xcodeproj
│   ├── Config.swift         # API configuration
│   ├── PhotoScoutApp.swift  # App entry point
│   ├── MainTabView.swift    # Main navigation
│   ├── Views/               # UI screens
│   ├── Components/          # Reusable UI components
│   ├── Models/              # Data models
│   └── Services/            # API service
└── update-config.sh         # Update API URLs from CDK
```

## Development

### Open in Xcode
```bash
open ios/PhotoScout/PhotoScout.xcodeproj
```

### Edit Code
Edit Swift files directly in `ios/PhotoScout/` directory using Xcode or any editor.

### Update Configuration
After deploying backend:
```bash
cd ios
./update-config.sh
```

This updates `PhotoScout/Config.swift` with your deployed CloudFront URL.

## TestFlight Deployment

See [TESTFLIGHT.md](TESTFLIGHT.md) for complete deployment guide.

Quick steps:
1. Open Xcode
2. Go to Signing & Capabilities tab
3. Enable "Automatically manage signing"
4. Select your Team
5. Change Bundle ID to your own (e.g., `com.yourname.PhotoScout`)
6. Select "Any iOS Device (arm64)"
7. Product → Archive
8. Distribute App → App Store Connect → Upload

## Files

- **PhotoScout/** - Xcode project with all Swift source code
- **update-config.sh** - Updates Config.swift with deployed API URLs
- **TESTFLIGHT.md** - Complete TestFlight deployment guide
