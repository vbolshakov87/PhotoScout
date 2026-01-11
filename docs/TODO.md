# PhotoScout - Project TODO

## Completed

### UI Modernization
- [x] Simplified to minimalist dark theme design
- [x] Removed excessive gradients and animations
- [x] Clean bottom navigation with 3 tabs
- [x] Responsive chat interface

### Chat Features
- [x] Chat persistence with IndexedDB
- [x] Conversation history page
- [x] Quick action buttons (duration, interests, confirm)
- [x] Message streaming with progress indicators
- [x] HTML preview for travel plans

### Image Generation
- [x] Google Imagen API integration (`packages/api/src/lib/imagen.ts`)
- [x] S3 caching for generated images
- [x] 40 top city destinations
- [x] 50 nature/landscape regions (including 10 German destinations)
- [x] Automatic prompt selection (city vs nature style)
- [x] Epic cinematic photography prompts for photographers
- [x] City name alias mapping (e.g., "New York City" → "New York")

### Legal Pages
- [x] About page
- [x] Terms of Service page
- [x] Privacy Policy page
- **Public URLs** (for App Store submission):
  - About: https://d2mpt2trz11kx7.cloudfront.net/about
  - Privacy: https://d2mpt2trz11kx7.cloudfront.net/privacy
  - Terms: https://d2mpt2trz11kx7.cloudfront.net/terms

### iOS App
- [x] WKWebView wrapper with native auth injection
- [x] Haptic feedback bridge
- [x] Share functionality bridge
- [x] Clipboard bridge
- [x] Console log capture for debugging
- [x] Fixed city name click handling
- [x] Fixed text input keyboard issues
- [x] Full WebView functionality working

### Deployment & Infrastructure
- [x] Add `GOOGLE_API_KEY` to `.env` file
- [x] Deploy CDK stack with updated Lambda permissions
- [x] Deploy latest web app with auto-image generation for trips
- [x] CloudFront SPA routing fix (403/404 → index.html)
- [x] Vite proxy configuration for local development (`/api/images`, `/city-images`)

### App Assets
- [x] **App Logo/Icon**: Created app icon for iOS
  - Generated using Google Imagen 4.0 with minimalist camera/location pin design
  - All icon sizes generated (16x16 to 1024x1024)
  - Location: `ios/PhotoScout/Assets.xcassets/AppIcon.appiconset/`
  - S3: https://d2mpt2trz11kx7.cloudfront.net/city-images/appicon.png

## In Progress

### Image Generation - REGENERATING ALL with Epic Photography Prompts
- [x] Regenerate ALL 94 destination images with new cinematic prompts
  - **Status**: 70/94 completed (quota limit reached on Jan 11)
  - **Remaining 24 images**: Cappadocia, Banff, Yosemite, Grand Canyon, Antelope Canyon, Monument Valley, Big Sur, Hawaii, Yellowstone, Patagonia, Torres del Paine, Bali, Ha Long Bay, Zhangjiajie, Maldives, New Zealand, Milford Sound, Mount Fuji, Guilin, Great Barrier Reef, Sahara Desert, Serengeti, Victoria Falls, Namib Desert
  - **Resume command**: `cd packages/api && npx tsx scripts/generate-missing-images.ts --regenerate-all --start-from=Cappadocia`
  - **Script**: `packages/api/scripts/generate-missing-images.ts --regenerate-all`

### Login Page Redesign (COMPLETED)
- [x] Updated iOS login with photo carousel background (using vbolshakov.photo portfolio)
- [x] Updated web login with matching photo carousel design
- [x] Added Terms & Privacy links to iOS login screen
- [x] Added photo credit attribution

### Settings Page (COMPLETED)
- [x] Added Settings tab to iOS app with About, Terms, Privacy, Sign Out
- [x] Added Settings page to web app with same functionality
- [x] User profile display with avatar

### Chat UX Improvements (COMPLETED)
- [x] Updated prompts to ask questions one-by-one (more conversational)
- [x] First response: asks duration only
- [x] Second response: asks photography interests only
- [x] Feels more natural and less overwhelming

### Trip Plan HTML (COMPLETED - World Class Redesign)
- [x] Added city hero image to generated HTML trip plans
- [x] Hero section with gradient overlay and title
- [x] Falls back gracefully if image not found
- [x] **Complete world-class redesign** (Jan 11, 2026):
  - Modern dark theme with CSS variables
  - Google Fonts: Playfair Display + Inter
  - 70vh hero with parallax zoom animation
  - Light schedule with visual sunrise/sunset timeline
  - Priority badges: "🔥 Must See", "⭐ Recommended", "💡 Optional"
  - Animated spot cards with staggered fade-in
  - Custom colored map markers by priority
  - SVG icon action buttons (Navigate, View Map, See Photos)
  - Info cards grid for practical info
  - Pro tips section with checkmarks
  - PhotoScout branded footer
  - All 6 existing trip plans regenerated with new design
- [x] Created CLI tools for rapid iteration:
  - `scripts/preview-html.ts` - Preview HTML locally without deploy
  - `scripts/regenerate-html.ts` - Regenerate from DynamoDB JSON

### Guest Mode (COMPLETED)
- [x] "Try without signing in" option on login page
- [x] Guest users get temporary ID
- [x] Limited functionality banner for guests
- [x] Trips not saved for guests (warning shown)

### Button Styling in Chat (COMPLETED)
- [x] Better visual affordance for chat buttons
- [x] "Quick select:" labels above option groups
- [x] Multi-select for interests with "Send" button
- [x] Improved shadows and containers

### iOS App Store Preparation
- [x] Configure app metadata in Xcode (bundle ID, version, build number)
- [x] Update Info.plist with App Store requirements
- [x] Privacy Policy URL: https://d2mpt2trz11kx7.cloudfront.net/privacy
- [x] Terms of Service URL: https://d2mpt2trz11kx7.cloudfront.net/terms
- [ ] Set up App Store Connect account and app listing
- [ ] Create App Store screenshots (6.7", 6.5", 5.5" sizes)
- [ ] Write App Store description and keywords
- [ ] Set Development Team in Xcode (requires Apple Developer account)
- [ ] Test on physical device
- [ ] Archive and upload build to App Store Connect
- [ ] Submit for App Review

## Pending

### Remaining Image Generation (Jan 12)
- [ ] Generate remaining 24 destination images when quota resets
  - Resume from: Cappadocia
  - Command: `cd packages/api && npx tsx scripts/generate-missing-images.ts --regenerate-all --start-from=Cappadocia`

### Spot Images in Plans
- [ ] Plan how to show images of recommended photography spots
  - Options: Flickr API, Unsplash API, or generate with Imagen
  - Display in the generated HTML trip plan
  - Consider bandwidth/loading time for mobile

### UI Updates
- [ ] Update webapp accent colors from blue to warm gold/orange to match app icon

### Future Enhancements
- [ ] Push notifications for trip reminders
- [ ] Offline mode with cached trips
- [ ] Multi-language support
- [ ] Trip sharing functionality
- [ ] Calendar integration

## Known Issues

### iOS Simulator
1. `CHHapticPattern` errors - Expected (no haptic hardware in simulator)
2. Auto Layout constraint warnings - Apple internal, auto-resolved
3. `RTIInputSystemClient` warnings - Keyboard-related simulator noise

### Web App
- None currently identified

### Google Imagen API
- Daily quota: 70 requests/day (paid tier 1)
- Quota resets at midnight Pacific Time
- Request increase: https://forms.gle/ETzX94k8jf7iSotH9

## Architecture

```
PhotoScout/
├── packages/
│   ├── api/          # Lambda functions (Node.js/TypeScript)
│   │   └── src/
│   │       ├── handlers/  # API route handlers
│   │       └── lib/       # Shared utilities (imagen.ts, etc.)
│   ├── web/          # React frontend (Vite/TypeScript)
│   │   └── src/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── pages/
│   └── shared/       # Shared types
├── ios/              # Native iOS app (SwiftUI)
│   └── PhotoScout/
│       ├── Components/   # WebView.swift, etc.
│       ├── Views/        # SwiftUI views
│       └── Services/     # AuthenticationService, etc.
└── infra/            # AWS CDK infrastructure
```

## Deployment URLs

- **Web App**: https://d2mpt2trz11kx7.cloudfront.net
- **Chat API**: https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/

## Key Files Modified (Session Jan 11, 2026)

### Login Page Redesign
- `ios/PhotoScout/Views/GoogleSignInView.swift` - Photo carousel background with portfolio images
- `packages/web/src/pages/LoginPage.tsx` - Matching web design with photo carousel

### Settings Pages
- `ios/PhotoScout/Views/SettingsTab.swift` - New Settings tab with About, Terms, Privacy, Sign Out
- `packages/web/src/pages/SettingsPage.tsx` - New Settings page for web
- `ios/PhotoScout/MainTabView.swift` - Added Settings tab to navigation
- `packages/web/src/components/navigation/BottomNav.tsx` - Added Settings to navigation
- `packages/web/src/App.tsx` - Added Settings route

### Chat UX
- `packages/api/src/lib/prompts.ts` - One-by-one question flow (dates first, then interests, then duration)

### Trip Plan HTML - World Class Redesign
- `packages/api/src/lib/html-template.ts` - Complete modern dark theme redesign
- `packages/api/scripts/preview-html.ts` - Local HTML preview tool (NEW)
- `packages/api/scripts/regenerate-html.ts` - Regenerate from DynamoDB (NEW)

### Guest Mode & Auth
- `packages/web/src/contexts/AuthContext.tsx` - Added guest login, isGuest state
- `packages/web/src/pages/LoginPage.tsx` - "Try without signing in" button, FedCM disabled for Safari

### Button Styling
- `packages/web/src/components/chat/MessageBubble.tsx` - Better button affordance, multi-select

### Previous Session (Jan 10-11)
1. `packages/web/src/pages/TripsPage.tsx` - Auto-generate images for missing cities
2. `packages/web/vite.config.ts` - Added proxy for `/api/images` and `/city-images`
3. `packages/api/src/lib/imagen.ts` - City name aliases + epic photography prompts
4. `infra/lib/photoscout-stack.ts` - CloudFront 403 error handling for SPA routing
5. `packages/api/scripts/generate-missing-images.ts` - Batch image generation script

## Destination List (94 total)

### Cities (40)
Tokyo, Paris, New York, London, Rome, Barcelona, Amsterdam, Berlin, Vienna, Prague, Lisbon, Copenhagen, Stockholm, Oslo, Bergen, Dubai, Singapore, Hong Kong, Sydney, Melbourne, San Francisco, Los Angeles, Chicago, Miami, Boston, Vancouver, Toronto, Montreal, Rio de Janeiro, Buenos Aires, Cape Town, Marrakech, Istanbul, Athens, Florence, Venice, Munich, Zurich, Brussels, Dublin

### Nature Regions (54)
**Europe - Alps & Mountains**: Dolomites, Swiss Alps, Scottish Highlands, Lofoten, Norwegian Fjords, Trolltunga, Faroe Islands

**Europe - Mediterranean & Lakes**: Lake Bled, Tuscany, Amalfi Coast, Cinque Terre, Provence, Santorini, Lake Como, Plitvice Lakes

**Europe - Atlantic**: Iceland, Normandy, Madeira, Azores, Slovenia

**Germany**: Black Forest, Saxon Switzerland, Bavarian Alps, Rhine Valley, Moselle Valley, Berchtesgaden, Lake Constance, Harz Mountains, Romantic Road, Baltic Sea Coast

**Middle East**: Cappadocia

**Americas - North**: Banff, Yosemite, Grand Canyon, Antelope Canyon, Monument Valley, Big Sur, Hawaii, Yellowstone

**Americas - South**: Patagonia, Torres del Paine

**Asia & Pacific**: Bali, Ha Long Bay, Zhangjiajie, Maldives, New Zealand, Milford Sound, Mount Fuji, Guilin, Great Barrier Reef

**Africa**: Sahara Desert, Serengeti, Victoria Falls, Namib Desert
