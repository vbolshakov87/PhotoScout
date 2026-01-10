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

## In Progress

### Image Generation
- [ ] Pre-generate remaining destination images (58/94 done)
  - **Status**: API quota limit reached (70/day on paid tier 1)
  - **Quota resets**: Daily at midnight Pacific Time (9:00 AM CET)
  - **Remaining**: ~36 images to generate
  - **New prompts deployed**: Epic cinematic photography style (will apply to new images)

## Pending

### App Assets
- [ ] **App Logo/Icon**: Create app icon for iOS
  - Style: Minimalist, matches dark theme
  - Suggested prompt: "Minimalist app icon for PhotoScout travel planning app. Clean geometric design featuring a stylized camera lens combined with a location pin or compass element. Dark background (#0a0a0f) with subtle gradient accents in warm colors. Modern, professional, suitable for iOS App Store. Square format, no text."
  - Sizes needed: 1024x1024 (App Store), plus iOS icon set

### Optional: Regenerate Images with New Style
- [ ] Delete existing city images from S3 to regenerate with epic photography style
  - Bucket: `photoscout-plans-707282829805`
  - Path: `city-images/*.png`
  - Will auto-regenerate when users visit trips page

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

## Key Files Modified (Session Jan 10, 2026)

1. `packages/web/src/pages/TripsPage.tsx` - Auto-generate images for missing cities
2. `packages/web/vite.config.ts` - Added proxy for `/api/images` and `/city-images`
3. `packages/api/src/lib/imagen.ts` - City name aliases + epic photography prompts
4. `infra/lib/photoscout-stack.ts` - CloudFront 403 error handling for SPA routing

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
