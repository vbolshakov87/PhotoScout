# PhotoScout 📷

AI-powered photo trip planning assistant with native iOS app and web interface. Plan stunning photography trips to 94 destinations worldwide with personalized AI recommendations.

## Live Demo

- **Web App**: https://d2mpt2trz11kx7.cloudfront.net
- **iOS App**: Coming soon to App Store

## Features

- 🤖 **AI Trip Planning** - Claude Sonnet 4 generates personalized photography itineraries
- 🖼️ **AI-Generated Images** - Google Imagen 4.0 creates stunning destination visuals
- 📱 **Native iOS App** - SwiftUI wrapper with Google Sign-In
- 🌐 **Responsive Web App** - React PWA accessible from any device
- 🗺️ **94 Destinations** - 40 cities + 54 nature/landscape locations
- 💬 **Conversational UI** - Natural language trip planning
- ☁️ **Serverless Backend** - AWS Lambda, DynamoDB, S3, CloudFront

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PHOTOSCOUT ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐
│   iOS App    │     │   Web App    │
│  (SwiftUI)   │     │   (React)    │
│  WKWebView   │     │  Vite + TS   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │ HTTPS
                ▼
┌───────────────────────────────────────┐
│           AWS CloudFront              │
│    (CDN + SPA Routing + Caching)      │
│    d2mpt2trz11kx7.cloudfront.net      │
└───────────────┬───────────────────────┘
                │
       ┌────────┴────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  S3 Bucket   │  │    Lambda    │  │    Lambda    │
│  (Static)    │  │   (Chat)     │  │ (Images API) │
│  - Web App   │  │              │  │              │
│  - HTML Plans│  │  Claude 4    │  │ Imagen 4.0   │
│  - Images    │  │  Sonnet      │  │ (Google)     │
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │  DynamoDB    │  │  S3 Bucket   │
                  │              │  │ (Generated)  │
                  │ - Chats      │  │              │
                  │ - Messages   │  │ - City imgs  │
                  │ - Plans      │  │ - App icons  │
                  └──────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
├─────────────────────────────┬───────────────────────────────────────────────┤
│  Anthropic Claude API       │  Google APIs                                  │
│  - Claude Sonnet 4          │  - Imagen 4.0 (image generation)              │
│  - Trip planning            │  - OAuth 2.0 (authentication)                 │
│  - Itinerary generation     │  - 94 destination images                      │
└─────────────────────────────┴───────────────────────────────────────────────┘
```

## Project Structure

```
PhotoScout/
├── packages/
│   ├── web/                 # React + Vite + Tailwind CSS
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── pages/       # Route pages
│   │   │   ├── contexts/    # React contexts (Auth)
│   │   │   ├── hooks/       # Custom hooks
│   │   │   └── lib/         # Utilities
│   │   └── dist/            # Production build
│   │
│   ├── api/                 # AWS Lambda functions
│   │   ├── src/
│   │   │   ├── handlers/    # Lambda handlers
│   │   │   └── lib/         # Shared utilities (imagen.ts)
│   │   └── scripts/         # Image generation scripts
│   │
│   └── shared/              # Shared TypeScript types
│
├── infra/                   # AWS CDK infrastructure
│   └── lib/
│       └── photoscout-stack.ts
│
├── ios/                     # Native iOS app
│   ├── PhotoScout/
│   │   ├── Views/           # SwiftUI views
│   │   ├── Components/      # WebView, UI components
│   │   ├── Services/        # Auth service
│   │   └── Assets.xcassets/ # App icons, images
│   └── AppStore/            # App Store metadata
│
└── docs/                    # Documentation
    └── TODO.md              # Project roadmap
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **iOS App** | SwiftUI, WKWebView, Google Sign-In SDK |
| **Web App** | React 18, TypeScript, Vite, Tailwind CSS |
| **API** | AWS Lambda (Node.js 20), TypeScript |
| **Database** | Amazon DynamoDB |
| **Storage** | Amazon S3 |
| **CDN** | Amazon CloudFront |
| **Infrastructure** | AWS CDK (TypeScript) |
| **AI - Chat** | Anthropic Claude Sonnet 4 |
| **AI - Images** | Google Imagen 4.0 |
| **Auth** | Google OAuth 2.0 |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- AWS CLI configured
- AWS CDK (`npm install -g aws-cdk`)

### Deploy Backend

```bash
# Clone repository
git clone https://github.com/vbolshakov87/PhotoScout.git
cd PhotoScout

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - ANTHROPIC_API_KEY
# - GOOGLE_API_KEY

# Deploy to AWS
./deploy.sh
```

### Run Web App Locally

```bash
pnpm dev:web
# Opens at http://localhost:5173
```

### Run iOS App

```bash
# Open in Xcode
open ios/PhotoScout/PhotoScout.xcodeproj

# Build and run (⌘R)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Stream AI chat responses (SSE) |
| `/api/conversations` | GET | List user conversations |
| `/api/conversations/:id` | GET | Get conversation with messages |
| `/api/conversations/:id` | DELETE | Delete conversation |
| `/api/plans` | GET | List trip plans |
| `/api/plans/:id` | GET | Get plan details |
| `/api/images/:city` | GET | Get/generate destination image |

## Destinations (94 Total)

### Cities (40)
Tokyo, Paris, New York, London, Rome, Barcelona, Amsterdam, Berlin, Vienna, Prague, Lisbon, Copenhagen, Stockholm, Oslo, Bergen, Dubai, Singapore, Hong Kong, Sydney, Melbourne, San Francisco, Los Angeles, Chicago, Miami, Boston, Vancouver, Toronto, Montreal, Rio de Janeiro, Buenos Aires, Cape Town, Marrakech, Istanbul, Athens, Florence, Venice, Munich, Zurich, Brussels, Dublin

### Nature & Landscapes (54)
**Europe**: Dolomites, Swiss Alps, Scottish Highlands, Lofoten, Norwegian Fjords, Lake Bled, Tuscany, Amalfi Coast, Cinque Terre, Provence, Santorini, Iceland, Faroe Islands, Lake Como, Plitvice Lakes

**Germany**: Black Forest, Saxon Switzerland, Bavarian Alps, Rhine Valley, Moselle Valley, Berchtesgaden, Lake Constance, Harz Mountains, Romantic Road, Baltic Sea Coast

**Americas**: Banff, Yosemite, Grand Canyon, Antelope Canyon, Monument Valley, Big Sur, Hawaii, Yellowstone, Patagonia, Torres del Paine

**Asia & Pacific**: Bali, Ha Long Bay, Zhangjiajie, Maldives, New Zealand, Milford Sound, Mount Fuji, Guilin, Great Barrier Reef

**Africa & Middle East**: Sahara Desert, Serengeti, Victoria Falls, Namib Desert, Cappadocia

## Image Generation

Destination images are generated using Google Imagen 4.0 with epic cinematic photography prompts:

```bash
# Generate missing images (70/day quota)
cd packages/api
npx tsx scripts/generate-missing-images.ts

# Regenerate all images with new style
npx tsx scripts/generate-missing-images.ts --regenerate-all

# Resume from specific destination
npx tsx scripts/generate-missing-images.ts --regenerate-all --start-from=Hawaii
```

## Environment Variables

```bash
# .env (root directory)

# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx      # Claude API
GOOGLE_API_KEY=AIza-xxxxx           # Imagen API

# Optional
DEEPSEEK_API_KEY=sk-xxxxx           # Alternative AI
ENVIRONMENT=production
AWS_REGION=eu-central-1
```

## Deployment

### Full Deployment
```bash
./deploy.sh
```

### Web App Only
```bash
cd packages/web
pnpm build
aws s3 sync dist s3://photoscout-plans-707282829805/web --delete
aws cloudfront create-invalidation --distribution-id E2AMYFW14UEUO7 --paths "/*"
```

### iOS App Store
See [ios/AppStore/metadata.md](ios/AppStore/metadata.md) for App Store submission guide.

## Monitoring

```bash
# View Lambda logs
./scripts/logs.sh chat
./scripts/logs.sh chat --follow

# AWS Console
# CloudWatch → Log groups → /aws/lambda/PhotoScoutStack-*
```

## Costs (Estimated)

| Service | Cost |
|---------|------|
| Lambda | ~$0.20 per 1M requests |
| DynamoDB | ~$1.25 per 1M writes |
| S3 | ~$0.023 per GB |
| CloudFront | ~$0.085 per GB |
| Claude API | ~$3 per 1M input tokens |
| Imagen API | ~$0.02 per image |

**Estimated**: <$10/month for moderate usage

## Security

- ✅ HTTPS everywhere (CloudFront)
- ✅ Google OAuth 2.0 authentication
- ✅ S3 Block Public Access
- ✅ CORS configured
- ✅ No API keys in frontend
- ✅ DynamoDB TTL for data cleanup

## Legal

- [Privacy Policy](https://d2mpt2trz11kx7.cloudfront.net/privacy)
- [Terms of Service](https://d2mpt2trz11kx7.cloudfront.net/terms)
- [About](https://d2mpt2trz11kx7.cloudfront.net/about)

## License

MIT License - see [LICENSE](LICENSE) file.

## Support

- 📧 Email: vbolshakov87@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/vbolshakov87/PhotoScout/issues)

---

Built with ❤️ using Claude, React, SwiftUI, and AWS
