# PhotoScout 📷

AI-powered photo trip planning assistant with native iOS app and web interface.

## Features

- 🤖 **AI-Powered Planning** - Claude Sonnet 4 generates personalized photo trip itineraries
- 📱 **Native iOS App** - Beautiful SwiftUI interface with Google Sign-In
- 🌐 **Web Interface** - Responsive React app accessible from any device
- 🗺️ **Interactive Plans** - Rich HTML maps with photo locations and timing
- 💬 **Conversational UI** - Natural language planning interface
- ☁️ **Serverless Backend** - AWS Lambda with DynamoDB for scalability
- 🔐 **Secure Authentication** - Google OAuth for user management

## Quick Start

### Deploy Backend (AWS)

```bash
# Prerequisites: Node.js 20+, pnpm, AWS CLI, AWS CDK
chmod +x deploy.sh
./deploy.sh
```

The deployment script will:
- Install dependencies
- Build all packages
- Deploy infrastructure to AWS
- Output your CloudFront URL

### Run iOS App

```bash
# Open in Xcode
open ios/PhotoScout/PhotoScout.xcodeproj

# Update configuration with deployed URLs
cd ios && ./update-config.sh
```

Then build and run in Xcode (⌘R).

### Local Development

```bash
# Install dependencies
pnpm install

# Start web development server
pnpm dev:web
# Opens at http://localhost:5173

# Build all packages
pnpm build
```

## Architecture

```
PhotoScout/
├── packages/
│   ├── web/          # React + Vite + Tailwind CSS
│   ├── api/          # AWS Lambda functions (chat, conversations, plans)
│   └── shared/       # Shared TypeScript types
├── infra/            # AWS CDK infrastructure as code
├── ios/              # Native iOS app (SwiftUI)
│   └── PhotoScout/
│       ├── Views/        # UI screens
│       ├── Services/     # API & Authentication
│       ├── Models/       # Data models
│       └── Components/   # Reusable UI
├── docs/             # Documentation
└── scripts/          # Deployment utilities
```

## Tech Stack

### Frontend
- **Web**: React 18, TypeScript, Vite, Tailwind CSS
- **iOS**: SwiftUI, WKWebView, Combine

### Backend
- **Compute**: AWS Lambda (Node.js 20)
- **Storage**: DynamoDB (conversations, messages, plans)
- **Files**: S3 (HTML plans)
- **CDN**: CloudFront
- **IaC**: AWS CDK

### AI
- **Primary**: Anthropic Claude Sonnet 4
- **Optional**: DeepSeek (for development)

## API Endpoints

All endpoints are served via CloudFront:

- `POST /api/chat` - Stream AI responses (Server-Sent Events)
- `GET /api/conversations` - List user conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/plans` - List photo trip plans
- `GET /api/plans/:id` - Get plan details
- `DELETE /api/plans/:id` - Delete plan
- `GET /plans/:visitorId/:planId.html` - View plan HTML (via CloudFront)

## Configuration

Create `.env` in project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional
DEEPSEEK_API_KEY=sk-xxxxx  # For development
ENVIRONMENT=production      # or development
AWS_REGION=eu-central-1
```

## Documentation

- [iOS App Guide](docs/IOS_APP.md) - iOS development and deployment
- [API Reference](docs/API.md) - Backend API documentation
- [Authentication Setup](docs/AUTHENTICATION.md) - Google OAuth configuration
- [Deployment Guide](docs/DEPLOYMENT.md) - AWS deployment instructions

## Development

### Commands

```bash
# Web development
pnpm dev:web              # Start Vite dev server
pnpm build:web            # Build web app

# API development
pnpm build:api            # Build Lambda functions
pnpm deploy:api           # Deploy API only

# Infrastructure
pnpm deploy               # Deploy everything
pnpm cdk                  # Run CDK commands

# Utilities
./scripts/logs.sh chat           # View chat function logs
./scripts/logs.sh chat --follow  # Follow logs in real-time
./scripts/test-api.sh            # Test API endpoints
./scripts/destroy.sh             # Destroy CloudFormation stack
```

### Local Testing

The web app proxies API requests to deployed Lambda functions during development:

```typescript
// packages/web/vite.config.ts configures proxy
server: {
  proxy: {
    '/api/chat': { target: chatApiUrl },
    '/api/conversations': { target: conversationsApiUrl },
    '/api/plans': { target: plansApiUrl }
  }
}
```

## iOS App Features

### Native UI Components
- ✅ SwiftUI TabView navigation
- ✅ Native list views with pull-to-refresh
- ✅ Swipe gestures and haptics
- ✅ iOS-native modal presentations
- ✅ SF Symbols icons

### Google Authentication
- ✅ Web-based OAuth 2.0 flow
- ✅ JWT token decoding
- ✅ Persistent authentication
- ✅ User profile display
- ✅ Sign-out with confirmation

### Data Synchronization
- ✅ Real-time plan updates
- ✅ Conversation history sync
- ✅ Offline-ready architecture
- ✅ Automatic retry on failure

See [docs/IOS_APP.md](docs/IOS_APP.md) for detailed iOS documentation.

## Environment Variables

### Backend (.env)
- `ANTHROPIC_API_KEY` - Claude API key (required)
- `DEEPSEEK_API_KEY` - DeepSeek API key (optional)
- `ENVIRONMENT` - production | development

### iOS (Config.swift)
- `webAppURL` - CloudFront distribution URL
- `apiBaseURL` - API base URL (same as web app)

Configuration is updated automatically via `ios/update-config.sh` after deployment.

## Monitoring & Logs

```bash
# View Lambda logs
./scripts/logs.sh chat              # Chat function
./scripts/logs.sh conversations     # Conversations function
./scripts/logs.sh plans             # Plans function

# Follow live logs
./scripts/logs.sh chat --follow

# AWS Console
# CloudWatch → Log groups → /aws/lambda/PhotoScoutStack-*
```

## Costs

PhotoScout uses serverless architecture for cost efficiency:

- **Lambda**: Pay per request (~$0.20 per 1M requests)
- **DynamoDB**: On-demand pricing (~$1.25 per million writes)
- **S3**: Storage + requests (~$0.023 per GB)
- **CloudFront**: Data transfer (~$0.085 per GB)
- **Claude API**: ~$3 per million input tokens

Estimated cost: **<$5/month** for low-moderate usage.

## Security

- ✅ CORS configured for CloudFront domain
- ✅ Lambda function URLs with auth
- ✅ S3 buckets with Block Public Access
- ✅ DynamoDB with Time-To-Live for data cleanup
- ✅ Google OAuth for user authentication
- ✅ No API keys exposed to frontend
- ✅ HTTPS everywhere via CloudFront

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Build Issues
```bash
# Clean install
rm -rf node_modules packages/*/node_modules
pnpm install

# Rebuild all
pnpm build
```

### Deployment Issues
```bash
# Check CDK outputs
cat cdk-outputs.json

# Verify stack
aws cloudformation describe-stacks --stack-name PhotoScoutStack

# Redeploy
pnpm deploy
```

### iOS Issues
```bash
# Update configuration
cd ios && ./update-config.sh

# Clean build
# Xcode: Product → Clean Build Folder (⇧⌘K)
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: vbolshakov87@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/PhotoScout/issues)

---

Built with ❤️ using Claude, React, SwiftUI, and AWS
