# PhotoScout - Quick Start Guide

Get PhotoScout running on TestFlight this weekend.

## Prerequisites (15 min)

```bash
# 1. Install pnpm
npm install -g pnpm

# 2. Install AWS CDK
npm install -g aws-cdk

# 3. Verify installations
node --version  # Should be 20+
pnpm --version
cdk --version
aws --version

# 4. Configure AWS CLI (if not already done)
aws configure
```

## Step 1: Build Backend (10 min)

```bash
cd /Users/vladimir/projects/PhotoScout

# Install dependencies
pnpm install

# Build shared types first
pnpm --filter @photoscout/shared build

# Build all packages
pnpm build
```

## Step 2: Deploy to AWS (15 min)

```bash
# 1. Store your Anthropic API key
aws ssm put-parameter \
  --name "/photoscout/anthropic-api-key" \
  --value "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" \
  --type "SecureString" \
  --region eu-central-1

# 2. Bootstrap CDK (first time only)
cd infra
pnpm cdk bootstrap

# 3. Deploy
pnpm cdk deploy

# Write down the CloudFront URL from the output!
# It will look like: https://d1234567890.cloudfront.net
```

## Step 3: Test Web App (5 min)

Open the CloudFront URL in your browser. You should see:
- PhotoScout chat interface
- Dark theme
- "Plan Your Photo Trip" welcome screen

Try chatting:
> "Photo trip to Hamburg this weekend"

You should get streaming responses from Claude.

## Step 4: Create iOS App (30 min)

### 4.1 Create Xcode Project
1. Open Xcode
2. File → New → Project
3. iOS → App
4. Settings:
   - Product Name: **PhotoScout**
   - Team: Your Apple Developer team
   - Organization ID: com.yourname
   - Interface: **SwiftUI**
   - Language: **Swift**
5. Save in `ios/PhotoScout/`

### 4.2 Add Swift Files

Create folders in Xcode Navigator:
- Right-click PhotoScout → New Group → "Views"
- Right-click PhotoScout → New Group → "Components"
- Right-click PhotoScout → New Group → "Models"
- Right-click PhotoScout → New Group → "Services"

Add files (File → New → File → Swift File):

1. **Root level:**
   - PhotoScoutApp.swift (replace existing)
   - MainTabView.swift
   - Config.swift

2. **Views folder:**
   - ChatTab.swift
   - PlansTab.swift
   - PlanDetailView.swift
   - HistoryTab.swift
   - ConversationDetailView.swift

3. **Components folder:**
   - WebView.swift
   - PlanRow.swift
   - ConversationRow.swift

4. **Models folder:**
   - Plan.swift
   - Conversation.swift

5. **Services folder:**
   - APIService.swift

**Copy code from `docs/IOS_CODE.md` into each file.**

### 4.3 Update Config

Edit `Config.swift` and replace:
```swift
static let apiBaseURL = "https://d1234567890.cloudfront.net"
```
with YOUR CloudFront URL from Step 2.

### 4.4 Update Info.plist

In Xcode, select Info.plist and add:
- Right-click → Add Row
- Key: `ITSAppUsesNonExemptEncryption`
- Type: Boolean
- Value: NO

### 4.5 Configure Signing

1. Select project in Navigator
2. Select PhotoScout target
3. Signing & Capabilities tab
4. Check "Automatically manage signing"
5. Select your Team

## Step 5: Test iOS App (10 min)

1. Select iPhone 15 Pro simulator
2. Press Cmd+R to build and run
3. Test:
   - ✅ Chat tab loads
   - ✅ Send a message
   - ✅ Get streaming response
   - ✅ Plans tab shows empty state
   - ✅ History tab shows empty state

## Step 6: Deploy to TestFlight (20 min)

### 6.1 Archive

1. In Xcode, select **Any iOS Device** (not simulator)
2. Product → Archive
3. Wait for build (5-10 min)

### 6.2 Upload

1. When Organizer opens, select your archive
2. Click **Distribute App**
3. Choose **App Store Connect**
4. Click **Upload**
5. Wait for upload (5 min)

### 6.3 Add Testers

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app (or create if first time)
3. Go to TestFlight tab
4. Wait for "Processing" to finish (~10 min)
5. Click "Internal Testing" or "External Testing"
6. Add testers by email
7. Click "Submit for Review" (external only)

### 6.4 Test on Device

1. Install TestFlight app on your iPhone
2. Accept invite email
3. Install PhotoScout
4. Test all features

## Troubleshooting

### Build fails: "Module not found"
```bash
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm --filter @photoscout/shared build
pnpm build
```

### CDK deploy fails
```bash
# Check if you're in the right directory
cd infra

# Try explicit bootstrap
cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-central-1

# Check for existing stack
aws cloudformation describe-stacks --region eu-central-1
```

### iOS app shows blank screen
1. Check Xcode console for errors
2. Verify Config.swift has **https://** URL (not http://)
3. Test CloudFront URL works in Safari on the device
4. Check Network tab in Xcode debugger

### Chat doesn't stream
```bash
# Check Lambda logs
aws logs tail /aws/lambda/PhotoScoutStack-ChatFunction --follow --region eu-central-1

# Verify API key exists
aws ssm get-parameter --name /photoscout/anthropic-api-key --region eu-central-1

# Test directly
curl -X POST https://YOUR_CF_DOMAIN/api/chat \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test","message":"hello"}'
```

## Common Issues

**Q: Archive button is grayed out**
- Make sure you selected "Any iOS Device" not a simulator

**Q: Can't upload - no distribution certificate**
- Xcode → Settings → Accounts → Manage Certificates
- Click + → Apple Distribution

**Q: TestFlight says "No builds available"**
- Wait 10-15 minutes for Apple to process
- Check email for issues

**Q: Localhost doesn't work on real iPhone**
- Update Config.swift to use CloudFront URL
- Or use ngrok: `ngrok http 5173`

## Success Checklist

- [ ] Backend deployed to AWS
- [ ] CloudFront URL works in browser
- [ ] Can chat and get responses
- [ ] Xcode project created
- [ ] All Swift files added
- [ ] Config.swift updated
- [ ] App builds in simulator
- [ ] Chat works in simulator
- [ ] Archive created
- [ ] Uploaded to TestFlight
- [ ] Tested on real device

## Next Steps

Once on TestFlight:
1. Share with photographer friends
2. Collect feedback
3. Iterate on prompts in `packages/api/src/lib/prompts.ts`
4. Add more cities to quick suggestions
5. Improve HTML plan templates

## Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --region us-east-1

# Set up billing alert (recommended)
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json
```

## Resources

- Main docs: [README.md](README.md)
- iOS code: [docs/IOS_CODE.md](docs/IOS_CODE.md)
- AWS CDK docs: https://docs.aws.amazon.com/cdk/
- TestFlight guide: https://developer.apple.com/testflight/

---

**Timeline:** 2-3 hours total from start to TestFlight

Good luck! 🚀
