# AI Scout - Alpha Launch TODO

**Domain:** https://aiscout.photo
**Goal:** Launch alpha version for beta testing with photographers

---

## P0 - Critical for Alpha Launch (Prompt Quality & Images)

### Prompt Quality
- [ ] **Add seasonal photography tips** (cherry blossoms, northern lights, monsoons)
- [ ] **Add local photographer insights** (hidden gems, less touristy spots)
- [ ] **Improve accuracy of sun times** (integrate SunCalc API)
- [ ] **Add weather considerations** per destination/season
- [x] **Security guardrails** - refuse off-topic/inappropriate requests
- [x] **Smart question flow** - skip questions if info already provided

### Images
- [ ] **Add spot images to trip plans** (Unsplash API integration)
- [ ] **Upgrade city image generation** (consider Imagen 3 or higher quality)
- [ ] **Generate remaining 24 destination images** (quota reset)
  - Command: `cd packages/api && npx tsx scripts/generate-missing-images.ts --regenerate-all --start-from=Cappadocia`

### Domain & Infrastructure
- [x] **Buy domain** - aiscout.photo ✓
- [x] **Configure SSL + CloudFront** ✓
- [x] **Update all URLs** to aiscout.photo ✓

---

## P1 - Important for Launch Quality

### Images
- [ ] **Add spot images to trip plans** (Unsplash API integration)
- [ ] **Review image generation quality** - consider Imagen 3 upgrade

### Features
- [ ] **PDF export** for offline use (photographers need this!)
- [ ] **GPX export** for GPS devices
- [ ] **Sunrise/sunset API** (SunCalc) for accurate times

### Monitoring
- [ ] **Error tracking** (Sentry) for crash reporting
- [ ] **API cost monitoring** dashboard

---

## P2 - Beta Testing

### Channels
- [ ] Reddit: r/photography, r/landscapephotography, r/travel_photography
- [ ] Facebook photography groups
- [ ] Personal network - photographer friends

### Feedback
- [ ] In-app feedback button
- [ ] Post-plan survey (rating + comments)
- [ ] Track: plans generated, completion rate, user ratings

### Marketing Assets
- [ ] Sample plans for top 10 destinations
- [ ] YouTube demo video (2-3 min)
- [ ] Screenshots for social media

---

## P3 - Post-Launch

### Partnerships
- [ ] Draft partnership email for PhotoHound
- [ ] Draft partnership email for LocationScout
- [ ] Create pitch deck

### Monetization
- [ ] Decide on model: Freemium vs One-time vs Partnership
- [ ] Implement payment if going direct-to-consumer

### Growth
- [ ] Product Hunt launch
- [ ] SEO landing pages for top 20 destinations
- [ ] Content marketing (blog posts, YouTube)

---

## Completed

### Core Functionality
- [x] Chat with AI trip planning
- [x] Plan generation (JSON → HTML)
- [x] Plan caching infrastructure
- [x] 70/94 destination images generated

### Apps
- [x] Web app with dark theme
- [x] iOS app (ready for App Store submission)
- [x] Guest mode (try without signing in)

### UX
- [x] Smart question flow (skip if info provided)
- [x] Minute-by-minute schedule in JSON
- [x] Difficulty levels for spots
- [x] Support for cities, places, regions, countries

### SEO
- [x] Meta tags, Open Graph, Twitter Cards
- [x] JSON-LD structured data
- [x] robots.txt and sitemap.xml

### Security
- [x] Prompt guardrails (refuse off-topic, inappropriate content)
- [x] Security tests added

### Infrastructure
- [x] AWS CDK deployment
- [x] CloudFront CDN
- [x] DynamoDB storage
- [x] Lambda functions
- [x] S3 for plans and images

### Documentation
- [x] LAUNCH_PLAN.md - Go-to-market strategy
- [x] WHAT_YOU_MIGHT_BE_MISSING.md - Gap analysis
- [x] Versioned prompts (v1, v2, v3)

---

## Quick Commands

```bash
# Build and deploy API
cd packages/api && npm run build
cd dist && zip -rq ../lambda.zip . && aws lambda update-function-code --function-name PhotoScoutStack-ChatFunction3D7C447E-Vj4CxXpKgBXF --zip-file fileb://../lambda.zip

# Build and deploy web
cd packages/web && npm run build
aws s3 sync dist s3://photoscout-web-707282829805 --delete
aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"

# Run tests
cd packages/api && npm test

# Generate missing images
cd packages/api && npx tsx scripts/generate-missing-images.ts --regenerate-all --start-from=Cappadocia
```

---

## URLs

- **Web App:** https://aiscout.photo
- **Privacy:** https://aiscout.photo/privacy
- **Terms:** https://aiscout.photo/terms
- **About:** https://aiscout.photo/about
- **Legacy:** https://d2mpt2trz11kx7.cloudfront.net (still works)

---

## Architecture

```
PhotoScout/
├── packages/
│   ├── api/           # Lambda (Node.js/TypeScript)
│   │   ├── src/handlers/   # chat.ts, plans.ts, etc.
│   │   ├── src/lib/        # prompts.ts, dynamo.ts, etc.
│   │   └── src/tests/      # Integration tests
│   ├── web/           # React (Vite/TypeScript)
│   └── shared/        # Shared types
├── ios/               # SwiftUI app
├── infra/             # AWS CDK
└── docs/              # Documentation
```
