# App Store Screenshots Guide

## Required Sizes

### iPhone (Required)
- **6.7" Display** (iPhone 15 Pro Max, 14 Pro Max): 1290 x 2796 pixels
- **6.5" Display** (iPhone 15 Plus, 14 Plus, 11 Pro Max): 1284 x 2778 pixels
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels

### iPad (Optional but recommended)
- **12.9" Display** (iPad Pro): 2048 x 2732 pixels

## Screenshot Content Plan (5-10 screenshots)

### Screenshot 1: Hero/Welcome
- **Content**: Login screen with PhotoScout logo
- **Caption**: "Your AI Photography Trip Planner"
- **Shows**: Clean login UI, app branding

### Screenshot 2: Chat Interface
- **Content**: Active conversation planning a trip
- **Caption**: "Chat with AI to Plan Your Trip"
- **Shows**: User asking about a destination, AI responding with suggestions

### Screenshot 3: Quick Actions
- **Content**: Chat with quick action buttons visible
- **Caption**: "Easy Trip Planning"
- **Shows**: Duration buttons, interest tags, confirm actions

### Screenshot 4: Trip Plan Preview
- **Content**: Generated HTML trip plan
- **Caption**: "Beautiful Detailed Itineraries"
- **Shows**: Day-by-day schedule, photography spots, tips

### Screenshot 5: Trips Gallery
- **Content**: Trips page with destination cards
- **Caption**: "94 Stunning Destinations"
- **Shows**: Grid of beautiful destination images (Tokyo, Paris, Dolomites, etc.)

### Screenshot 6: Destination Detail
- **Content**: A specific destination with cinematic image
- **Caption**: "Cinematic Destination Imagery"
- **Shows**: Full-screen destination image with trip details

### Screenshot 7: History
- **Content**: Conversation history page
- **Caption**: "Save All Your Plans"
- **Shows**: List of past conversations with search

### Screenshot 8: Nature Destinations
- **Content**: Nature/landscape destinations grid
- **Caption**: "From Alps to Amazon"
- **Shows**: Swiss Alps, Patagonia, Grand Canyon cards

## Capturing Screenshots

### Using Xcode Simulator
```bash
# Boot simulator
xcrun simctl boot "iPhone 15 Pro Max"

# Take screenshot
xcrun simctl io booted screenshot screenshot.png
```

### Using Xcode
1. Run app on simulator
2. Navigate to desired screen
3. File → New Screenshot (⌘S)

### Tips
- Use clean/demo data for screenshots
- Ensure status bar shows full battery, strong signal
- Time should be clean (9:41 AM is Apple's standard)
- Hide any personal information
- Use consistent color scheme throughout

## Screenshot Specifications

- Format: PNG or JPEG
- Color space: sRGB
- No alpha/transparency
- No device frames (App Store adds them automatically)
- Landscape or portrait orientation

## Localization
Currently English only. Can add:
- German (de-DE)
- French (fr-FR)
- Spanish (es-ES)
- Japanese (ja-JP)

## Preview Video (Optional)
- 15-30 seconds
- Show key features: chat, trip generation, destinations
- No audio required but can add music
- Same device sizes as screenshots
