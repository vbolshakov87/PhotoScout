# PhotoScout 📷

[![CI](https://github.com/vbolshakov87/PhotoScout/actions/workflows/ci.yml/badge.svg)](https://github.com/vbolshakov87/PhotoScout/actions/workflows/ci.yml)
[![CodeQL](https://github.com/vbolshakov87/PhotoScout/actions/workflows/codeql.yml/badge.svg)](https://github.com/vbolshakov87/PhotoScout/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/vbolshakov87/PhotoScout/graph/badge.svg)](https://codecov.io/gh/vbolshakov87/PhotoScout)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-20.x-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered photo trip planning assistant with native iOS app and web interface. Plan stunning photography trips to 94 destinations worldwide with personalized AI recommendations.

## Table of Contents

- [Live Demo](#live-demo)
- [Project Roadmap](#-project-roadmap)
- [Third-Party Service Consoles](#-third-party-service-consoles)
- [Features](#features)
- [Solution Architecture](#solution-architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Destinations](#destinations-94-total)
- [Destination Images](#destination-images)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Costs](#costs-estimated)
- [Security](#security)
  - [Security Testing with Promptfoo](#security-testing-with-promptfoo)
- [Legal](#legal)
- [License](#license)
- [Support](#support)

---

## Live Demo

- **Web App**: https://aiscout.photo
- **iOS App**: Coming soon to App Store

---

## 📋 Project Roadmap

See **[docs/TODO.md](docs/TODO.md)** for prioritized tasks and launch checklist.

**Current Priorities:**
1. Prompt quality improvements (seasonal tips, local insights)
2. Add spot images to trip plans (Unsplash API)
3. Improve destination image quality

---

## 🔗 Third-Party Service Consoles

Quick links to manage external integrations:

| Service | Console | What to Configure |
|---------|---------|-------------------|
| **Google OAuth** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | OAuth 2.0 Client ID, Authorized domains, Redirect URIs |
| **Google Analytics** | [GA4 Admin](https://analytics.google.com/) | Get Measurement ID (G-XXXXXXXXXX), Configure events |
| **Unsplash** | [Unsplash Developers](https://unsplash.com/developers) | API Access Key for destination images |
| **Anthropic Claude** | [Anthropic Console](https://console.anthropic.com/) | API keys, Usage & billing |
| **DeepSeek** | [DeepSeek Platform](https://platform.deepseek.com/) | Cheaper LLM alternative (~$0.14/1M tokens vs $3) |
| **AWS Console** | [AWS Console](https://console.aws.amazon.com/) | Lambda, DynamoDB, S3, CloudFront |
| **Route 53** | [Route 53 Console](https://console.aws.amazon.com/route53/) | DNS records for aiscout.photo |
| **ACM Certificates** | [ACM Console](https://us-east-1.console.aws.amazon.com/acm/) | SSL certificates (must be us-east-1) |

### Configuration Checklist

```bash
# Google OAuth - Update authorized domains:
# 1. Go to Google Cloud Console → APIs & Services → Credentials
# 2. Edit OAuth 2.0 Client ID
# 3. Add to Authorized JavaScript origins:
#    - https://aiscout.photo
#    - https://www.aiscout.photo
# 4. Add to Authorized redirect URIs:
#    - https://aiscout.photo
#    - https://aiscout.photo/auth/callback

# Google Analytics - Get Measurement ID:
# 1. Go to analytics.google.com
# 2. Admin → Data Streams → Web
# 3. Copy Measurement ID (G-XXXXXXXXXX)
# 4. Update packages/web/index.html

# Unsplash - Get API Key:
# 1. Go to unsplash.com/developers
# 2. Create a new application
# 3. Copy Access Key to .env as UNSPLASH_ACCESS_KEY
```

---

## Features

- 🤖 **AI Trip Planning** - Claude Haiku 4.5 generates personalized photography itineraries
- 🖼️ **Pluggable Image Providers** - Unsplash (default) or custom API for destination photos
- 📱 **Native iOS App** - SwiftUI wrapper with Google Sign-In and guest mode
- 🌐 **Responsive Web App** - React PWA accessible from any device
- 🗺️ **Any Destination** - Request any destination, 94 pre-warmed for instant response
- 💬 **Conversational UI** - Natural language trip planning with guided questions
- 👤 **Guest Mode** - Try the app without signing in
- ☁️ **Serverless Backend** - AWS Lambda, DynamoDB, S3, CloudFront

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PHOTOSCOUT ARCHITECTURE                         │
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
│           aiscout.photo               │
└───────────────┬───────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌──────────────┐
│  S3    │ │  S3    │ │   Lambda     │
│ (Web)  │ │(Images)│ │              │
│        │ │        │ │ - Chat       │
│ - SPA  │ │ - Dest │ │ - Plans      │
│ - Plans│ │  photos│ │ - Destinations│
└────────┘ └────────┘ └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  DynamoDB    │
                      │              │
                      │ - Messages   │
                      │ - Chats      │
                      │ - Plans      │
                      │ - Users      │
                      │ - Destinations│
                      └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
├─────────────────────────────┬───────────────────────────────────────────────┤
│  Anthropic Claude API       │  Other Services                               │
│  - Claude Haiku 4.5         │  - Google OAuth 2.0 (authentication)          │
│  - Trip planning            │  - Image Providers (pluggable)                │
│  - Itinerary generation     │    → Unsplash (default) or Custom API         │
└─────────────────────────────┴───────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      IMAGE PIPELINE (Runtime Lazy Loading)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GET /api/destinations/:id  (accepts ANY destination name)                  │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────┐  Found?  ┌─────────────┐                                   │
│  │  DynamoDB   │───YES───▶│  Return     │──▶ CloudFront URL (~50ms)         │
│  │  Lookup     │          │  Cached URL │                                   │
│  └─────────────┘          └─────────────┘                                   │
│       │ NO                                                                  │
│       ▼                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │   Image     │────▶│  Upload to  │────▶│  Save to    │                    │
│  │  Provider   │     │  S3 Bucket  │     │  DynamoDB   │                    │
│  │ (pluggable) │     └─────────────┘     └─────────────┘                    │
│  └─────────────┘                               │                            │
│                                                ▼                            │
│                                          CloudFront URL                     │
│                                          (cached 1 year)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
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
│   │   │   ├── handlers/    # Lambda handlers (chat, plans, destinations)
│   │   │   ├── lib/         # Shared utilities (prompts, validators)
│   │   │   │   └── image-providers/  # Pluggable image providers
│   │   │   └── tests/
│   │   │       ├── security/  # Security tests (74 attack vectors)
│   │   │       └── quality/   # Quality tests (Promptfoo)
│   │   └── scripts/         # Cache warming, Promptfoo converters
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
| **AI - Chat** | Anthropic Claude Haiku 4.5 |
| **Images** | Pluggable providers (Unsplash default, custom API ready) |
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
# - UNSPLASH_ACCESS_KEY

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
| `/api/destinations/:id` | GET | Get destination image (lazy-loads on first request) |

## Destination Images

Users can request **any destination** via `/api/destinations/:id`. Images are lazy-loaded at runtime using a pluggable provider strategy:

**How it works:**
1. Request `/api/destinations/swiss-alps` (any destination name)
2. DynamoDB lookup - if cached, return CloudFront URL instantly
3. If not cached: fetch from image provider → upload to S3 → save metadata to DynamoDB
4. Subsequent requests return cached CloudFront URL (~50ms)

**Image Providers (pluggable):**
- **Unsplash** (default) - Professional photos with attribution
- **Custom** (planned) - Your own image API for license-free images

```bash
cd packages/api

# Pre-warm cache for 94 suggested destinations
pnpm images:fetch                    # All 94 via deployed API
pnpm images:fetch -- --limit 5       # First 5 only
pnpm images:fetch -- --dry-run       # Preview without API calls
pnpm images:fetch -- --local         # Use local dev server
```

**Pre-warmed Destinations (89):**
- **Cities (40)**: Tokyo, Paris, New York, London, Rome, Barcelona, Amsterdam, Berlin, Vienna, Prague, Lisbon, Copenhagen, Stockholm, Dubai, Singapore, Sydney, San Francisco, etc.
- **Nature - Europe (15)**: Dolomites, Swiss Alps, Scottish Highlands, Lofoten, Norwegian Fjords, Lake Bled, Tuscany, Amalfi Coast, Santorini, Iceland, etc.
- **Nature - Germany (10)**: Black Forest, Saxon Switzerland, Bavarian Alps, Rhine Valley, Berchtesgaden, etc.
- **Nature - Americas (10)**: Banff, Yosemite, Grand Canyon, Big Sur, Hawaii, Patagonia, etc.
- **Nature - Asia Pacific (9)**: Bali, Ha Long Bay, Maldives, New Zealand, Mount Fuji, etc.
- **Nature - Africa (5)**: Sahara Desert, Serengeti, Victoria Falls, Cappadocia, etc.

Images are stored in S3 with CloudFront CDN (1-year cache). Attribution metadata is stored in DynamoDB.

## Environment Variables

```bash
# .env (root directory)

# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx      # Claude API
UNSPLASH_ACCESS_KEY=xxxxx           # Unsplash API (for destination images)

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
| **DeepSeek API** | ~$0.14 per 1M input tokens (20x cheaper!) |
| Image Provider | Free (Unsplash: 50 req/hr Demo, 5000 req/hr Production) |

**Estimated**: <$10/month for moderate usage

**Cost Optimization:** Set `ENVIRONMENT=development` in `.env` to use DeepSeek instead of Claude for testing.

## Security

- ✅ HTTPS everywhere (CloudFront)
- ✅ Google OAuth 2.0 authentication
- ✅ S3 Block Public Access
- ✅ CORS configured
- ✅ No API keys in frontend
- ✅ DynamoDB TTL for data cleanup
- ✅ LLM guardrails (prompt injection protection)
- ✅ Output validation (leakage detection)

### Security Testing with Promptfoo

Comprehensive LLM security testing using [Promptfoo](https://promptfoo.dev) with 74 attack vectors across 6 models.

#### Quick Start

```bash
cd packages/api

# Generate config and run tests
pnpm security:convert           # Generate promptfoo config (all 6 models)
pnpm security:eval              # Run full test suite (~$0.50)
pnpm security:eval:critical     # Critical tests only (~$0.15)
```

#### Model Selection

```bash
# Production model only (Claude Haiku 4.5) - fastest, cheapest
pnpm security:convert -- --prod
pnpm security:eval              # ~$0.03 for 74 tests

# All 6 models (default)
pnpm security:convert
pnpm security:eval              # ~$0.50 for 444 tests
```

#### Available Models (6)

| Model | Tier | Cost/1M tokens |
|-------|------|----------------|
| GPT-4o Mini | Ultra-budget | $0.15 |
| DeepSeek V3.2 | Ultra-budget | $0.14 |
| Gemini 3 Flash | Ultra-budget | $0.10 |
| Claude Haiku 4.5 | Budget | $0.80 |
| **Claude Sonnet 4.5** | Quality | $3.00 |
| Mistral Large 3 | Quality | $2.00 |

#### Test Categories (74 vectors)

| Category | Count | Description |
|----------|-------|-------------|
| prompt_injection | 11 | Direct override, fake system messages |
| jailbreak | 10 | DAN, roleplay, hypotheticals |
| data_extraction | 10 | System prompt leakage attempts |
| context_manipulation | 4 | Token overflow, context poisoning |
| off_topic | 18 | Code generation, homework, controversial |
| photography_adjacent | 13 | Surveillance, trespassing, illegal |
| encoding_tricks | 8 | Base64, Unicode, multi-language |

#### Reports & Visualization

```bash
pnpm security:report            # Generate HTML report
pnpm security:view              # Interactive browser view
```

#### CI/CD Integration

Security tests run **manually only** (to control API costs):
1. Go to Actions → "LLM Security Tests (Promptfoo)"
2. Click "Run workflow"
3. Choose model set (`prod`, `default`, `all`) and filter (`CRITICAL`, etc.)

See [docs/SECURITY_REPORT.md](docs/SECURITY_REPORT.md) for detailed security documentation.

## Legal

- [Privacy Policy](https://aiscout.photo/privacy)
- [Terms of Service](https://aiscout.photo/terms)
- [About](https://aiscout.photo/about)

## License

MIT License - see [LICENSE](LICENSE) file.

## Support

- 📧 Email: vbolshakov87@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/vbolshakov87/PhotoScout/issues)

---

Built with ❤️ using Claude, React, SwiftUI, and AWS
