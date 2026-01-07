# PhotoScout

A mobile-first photo trip planning assistant built with React, AWS Lambda, and native iOS.

## Architecture

```
photoscout/
├── packages/
│   ├── web/          # React + Vite + Tailwind
│   ├── api/          # Lambda functions
│   └── shared/       # Shared TypeScript types
├── infra/            # AWS CDK infrastructure
├── ios/              # iOS app (Xcode project)
└── scripts/          # Deployment utilities
```

## Quick Start

### Prerequisites

- Node.js 20+ (use `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- AWS CLI configured
- AWS CDK (`npm install -g aws-cdk`)

### Deployment

```bash
# Make executable (first time only)
chmod +x deploy.sh

# Deploy everything
./deploy.sh
```

The script will:
- Check prerequisites
- Install dependencies
- Build all packages
- Deploy to AWS
- Output CloudFront URL

### Manual Build

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Deploy infrastructure
pnpm deploy
```

## iOS App

See [ios/README.md](ios/README.md) and [ios/TESTFLIGHT.md](ios/TESTFLIGHT.md) for iOS setup and deployment.

Quick start:
```bash
# Open Xcode project
open ios/PhotoScout/PhotoScout.xcodeproj

# After backend deployment, update config
cd ios && ./update-config.sh
```

## Utilities

### View Logs
```bash
./scripts/logs.sh chat          # View chat function logs
./scripts/logs.sh chat --follow # Follow in real-time
```

### Test API
```bash
./scripts/test-api.sh
```

### Destroy Stack
```bash
./scripts/destroy.sh
```

## API Endpoints

- `POST /api/chat` - Stream chat responses (SSE)
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `GET /api/plans` - List photo trip plans
- `GET /api/plans/:id` - Get plan with HTML
- `DELETE /api/plans/:id` - Delete plan

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS
**Backend:** AWS Lambda, DynamoDB, CloudFront
**AI:** Anthropic Claude Sonnet 4
**Mobile:** SwiftUI, WKWebView

## Configuration

Create `.env` in project root:

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
AWS_REGION=eu-central-1
```

## Development

```bash
# Web development
pnpm dev:web
# Opens at http://localhost:5173

# Build packages
pnpm build:web
pnpm build:api
```

## License

MIT
