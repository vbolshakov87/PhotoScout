# PhotoScout UI Design Prompt for Gemini Image Generation

Design a modern, minimalist mobile-first UI for "PhotoScout" - an AI-powered photography trip planning app. The app helps photographers discover and plan photo trips to destinations worldwide (cities like Tokyo, Paris, Barcelona and nature spots like Dolomites, Lofoten, Banff).

## Brand Identity

- App name: PhotoScout (or AIScout.photo)
- Primary color: Deep violet/purple (#6366f1 or similar)
- Background: Dark theme (#0a0a0a base, #141414 cards)
- Text: White (#f9fafb) for primary, gray (#9ca3af) for secondary
- Accent: Violet for interactive elements, buttons, and highlights
- Border radius: Generous rounded corners (16px for cards, full rounded for buttons)
- Typography: Clean sans-serif (SF Pro, Inter, or similar), good contrast

## Design Principles

- Mobile-first: Design for 375px-428px width phones primarily
- Thumb-friendly: Important actions within easy thumb reach at bottom of screen
- Generous whitespace and padding (16-20px)
- Smooth, subtle animations implied through design
- Dark mode optimized for OLED screens
- Photography-focused: Let potential photo content shine

---

## SCREEN 1: Chat Page (Main Conversation Interface)

### Layout - Mobile (primary)

**Top Section:**
- Sticky header with app logo "PhotoScout" on left
- Small "+ New" button on right to start new conversation
- Thin border bottom separator

**Chat Area (scrollable, takes most of screen):**
- User messages: Right-aligned bubbles with violet/purple background (#6366f1), white text, rounded corners (rounded-2xl with bottom-right less rounded)
- AI messages: Left-aligned bubbles with dark card background (#141414), subtle border (#262626), white text, rounded corners (rounded-2xl with bottom-left less rounded)
- AI messages can contain:
  - Plain text responses
  - Markdown formatting (bold headers, bullet lists, numbered lists)
  - Interactive suggestion chips (see below)
  - Generated HTML trip plan preview (interactive map card)

**AI Suggestion Chips:**
- When AI asks questions, show clickable option buttons below the message
- Chips arranged in a flex-wrap grid, 2-3 per row
- Each chip: Rounded pill shape, dark background with border, emoji + label
- Example chips: "🌅 Sunrise", "🌇 Sunset", "✨ Golden hour", "🏛️ Architecture", "🚶 Street photography"
- Multi-select chips have checkmark indicator when selected
- Selected state: Violet background, white text
- "Send" button appears when chips are selected

**Progress Indicator (when generating trip plan):**
- Appears as a special message bubble
- Shows: Spinning loader icon, "Processing..." title, current stage text ("Finding photography spots...", "Planning routes...", "Finalizing plan...")
- Animated progress bar (0-100%) with violet fill
- Percentage text on right

**Generated Trip Plan Preview:**
- When trip plan is ready, shows as an embedded interactive card
- Mini map preview at top (showing route and markers)
- Title and subtitle of the trip
- Stats row: Number of spots, Must-see count, Duration
- Action buttons: "Open Full Plan", "Share"

**Bottom Section (fixed):**
- Text input field with placeholder "Where do you want to explore?"
- Large rounded corners, dark background, subtle border
- Send button (arrow icon) on right side, violet when text is entered
- Safe area padding for phones with home indicator

**Desktop Adaptation (secondary):**
- Center the chat in a max-width container (600-700px)
- Add subtle side margins/padding
- Input field can be slightly larger

---

## SCREEN 2: Trips/Plans Page - Grid View

### Layout - Mobile

**Top Section:**
- Header: "My Trips" title on left
- View toggle buttons on right: Grid icon (active/violet) and List icon
- Optional filter/sort dropdown

**Grid Content (2 columns on mobile):**
- Cards arranged in 2-column masonry or fixed grid
- Each card represents a saved trip plan

**Trip Card Design:**
- Aspect ratio roughly 4:5 or square
- Background: Gradient overlay on a subtle pattern or solid dark card
- Top: Small city/destination tag pill (e.g., "Paris", "Dolomites")
- Center: Large destination name as title
- Bottom section:
  - Date created or trip dates
  - Spots count badge (e.g., "6 spots")
  - Small icons for: Must-see count (fire emoji), Duration
- Subtle hover/press effect implied
- Optional: Tiny map thumbnail or iconic image placeholder

**Card Visual Hierarchy:**
- Must-see/high-priority trips could have a subtle violet left border or glow
- Recently created trips at top
- Gentle shadow for depth

**Empty State:**
- Friendly illustration or icon (camera, map pin)
- "No trips yet" message
- "Start planning" CTA button linking to chat

**Desktop Adaptation:**
- 3-4 columns grid
- Larger cards with more details visible
- Hover states more prominent

---

## SCREEN 3: Trips/Plans Page - List View

### Layout - Mobile

**Top Section:**
- Same header as grid view
- View toggle: List icon now active/violet, Grid icon inactive

**List Content:**
- Full-width cards stacked vertically
- More horizontal layout per card

**List Card Design:**
- Horizontal card, roughly 80-100px height
- Left side (20%):
  - Small square thumbnail/map preview or gradient placeholder
  - Or large number/icon
- Center (60%):
  - Destination name (bold, larger)
  - Trip dates or "Created Jan 15, 2026"
  - Tags row: "6 spots • 3 days • Architecture"
- Right side (20%):
  - Chevron arrow icon indicating tap to open
  - Or 3-dot menu for quick actions

**List Item States:**
- Default: Standard dark card
- Pressed: Slightly lighter background
- Swipe actions (implied): Delete, Share

**Section Grouping (optional):**
- Group by month: "January 2026", "December 2025"
- Or by region: "Europe", "Asia", "Americas"
- Section headers: Small, uppercase, gray text

**Desktop Adaptation:**
- Single column, centered (max-width 700px)
- Cards can show more inline details
- Hover reveals additional actions

---

## SCREEN 4: Individual Trip Plan View (Full Plan)

### Layout - Mobile

**Sticky Top Bar:**
- Back arrow on left
- Sunrise/sunset times in center (e.g., "🌅 06:15  🌇 20:30")
- Action icons on right: Theme toggle (moon/sun), Print, Share

**Hero Section:**
- Large title: Trip name (e.g., "Paris Photo Trip")
- Subtitle: Description and dates
- Interactive map (full width, ~200px height) showing all spots with numbered markers and route line

**Stats Row:**
- 3 equal boxes showing: Total Spots, Must-See count, Duration
- Clean typography, numbers prominent

**Quick Navigation:**
- Horizontal scrollable list of all spots as small pills
- Each shows: Number, Time, Spot name (truncated)
- Tapping scrolls to that spot
- Priority spots have colored indicator (red for must-see, orange for recommended)

**Day Tabs (for multi-day trips):**
- Horizontal tab bar: "Day 1", "Day 2", "Day 3"
- Active tab has violet background
- Scrollable if many days

**Light Schedule Card:**
- Golden/amber gradient background
- Shows: Blue hour AM, Golden hour AM, Golden hour PM, Blue hour PM
- Each with time range
- Compact 4-column grid

**Spot Cards (main content):**
- Vertical stack of detailed spot cards
- Each card:
  - Left colored sidebar (red=must-see, orange=recommended, gray=optional) with spot number
  - Header: Spot name, scheduled time range, checkmark button
  - Description paragraph
  - Details grid: Best time, Distance, Crowd level, Parking info
  - Tags: Horizontal pill list (e.g., "Golden Hour", "Long Exposure", "Reflections")
  - Action buttons: "Navigate" (primary violet), "Flickr", "Google", "Instagram"

**Spot Card Interaction:**
- Checkbox to mark as visited (dims card when checked)
- Tap "Navigate" opens Google Maps directions

**Sticky Bottom Navigation:**
- Progress ring showing spots completed (e.g., "2/6")
- Current/next spot info
- "Next" button to scroll to next incomplete spot

**Desktop Adaptation:**
- Two-column layout: Map on left (sticky), Spots list on right (scrollable)
- Or centered single column (max-width 700px)
- Map can be larger and more interactive

---

## Additional UI Elements

### Loading States
- Skeleton screens for cards while loading
- Subtle shimmer animation implied

### Error States
- Friendly error messages in card format
- Retry button

### Toasts/Notifications
- Bottom of screen, rounded, dark with border
- Success (green accent), Error (red accent), Info (violet accent)

### Modals
- Share modal with social icons grid (Twitter, Telegram, WhatsApp, Pinterest, Instagram)
- Copy link input field
- Centered on screen with dark overlay background

### Typography Scale
- Headings: 28px (h1), 18px (h2), 16px (h3)
- Body: 14-15px
- Small/caption: 11-12px
- All with appropriate line-height for readability

---

## Deliverables Requested

Please generate high-fidelity mockups showing:
1. Chat page with conversation, AI suggestions, and progress indicator (mobile)
2. Trips page in grid view with 4-6 trip cards (mobile)
3. Trips page in list view with 4-6 trips (mobile)
4. Individual trip plan view showing map, stats, and 2-3 spot cards (mobile)
5. Optional: Desktop versions of chat and trip plan pages

**Style:** Clean, modern, dark theme, photography-focused, professional yet approachable. Similar aesthetic to apps like Linear, Raycast, or Arc browser - sophisticated dark UI with careful attention to typography and spacing.

---

## Supported Destinations Reference

### Cities (40)
Tokyo, Paris, New York, London, Rome, Barcelona, Amsterdam, Berlin, Vienna, Prague, Lisbon, Copenhagen, Stockholm, Oslo, Bergen, Dubai, Singapore, Hong Kong, Sydney, Melbourne, San Francisco, Los Angeles, Chicago, Miami, Boston, Vancouver, Toronto, Montreal, Rio de Janeiro, Buenos Aires, Cape Town, Marrakech, Istanbul, Athens, Florence, Venice, Munich, Zurich, Brussels, Dublin

### Nature & Landscapes (54)
**Europe**: Dolomites, Swiss Alps, Scottish Highlands, Lofoten, Norwegian Fjords, Lake Bled, Tuscany, Amalfi Coast, Cinque Terre, Provence, Santorini, Iceland, Faroe Islands, Lake Como, Plitvice Lakes

**Germany**: Black Forest, Saxon Switzerland, Bavarian Alps, Rhine Valley, Moselle Valley, Berchtesgaden, Lake Constance, Harz Mountains, Romantic Road, Baltic Sea Coast

**Americas**: Banff, Yosemite, Grand Canyon, Antelope Canyon, Monument Valley, Big Sur, Hawaii, Yellowstone, Patagonia, Torres del Paine

**Asia & Pacific**: Bali, Ha Long Bay, Zhangjiajie, Maldives, New Zealand, Milford Sound, Mount Fuji, Guilin, Great Barrier Reef

**Africa & Middle East**: Sahara Desert, Serengeti, Victoria Falls, Namib Desert, Cappadocia
