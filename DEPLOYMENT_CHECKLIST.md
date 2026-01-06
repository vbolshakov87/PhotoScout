# PhotoScout Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

### Environment Setup
- [ ] Node.js 20+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] AWS CLI configured (`aws sts get-caller-identity`)
- [ ] AWS CDK installed (`cdk --version`)
- [ ] Anthropic API key obtained
- [ ] Apple Developer account active
- [ ] Xcode 15+ installed

### Project Setup
- [ ] Repository cloned/created
- [ ] Dependencies installed (`pnpm install`)
- [ ] Shared package built (`pnpm --filter @photoscout/shared build`)
- [ ] All packages built (`pnpm build`)
- [ ] No build errors

## Backend Deployment (AWS)

### API Key Storage
- [ ] API key stored in SSM Parameter Store
  ```bash
  aws ssm put-parameter \
    --name "/photoscout/anthropic-api-key" \
    --value "sk-ant-xxxxx" \
    --type "SecureString" \
    --region eu-central-1
  ```
- [ ] Parameter verified
  ```bash
  aws ssm get-parameter \
    --name /photoscout/anthropic-api-key \
    --region eu-central-1
  ```

### CDK Bootstrap (First Time Only)
- [ ] CDK bootstrapped
  ```bash
  cd infra
  pnpm cdk bootstrap
  ```
- [ ] Bootstrap stack exists in CloudFormation

### Infrastructure Deployment
- [ ] All packages built (`cd .. && pnpm build`)
- [ ] CDK diff checked (`cd infra && pnpm cdk diff`)
- [ ] Stack deployed (`pnpm cdk deploy`)
- [ ] Deployment completed successfully
- [ ] CloudFront URL saved: `____________________________`

### Post-Deployment Verification
- [ ] CloudFront distribution active
- [ ] Web app loads in browser
- [ ] Chat interface visible
- [ ] DynamoDB tables created (3 tables)
- [ ] Lambda functions deployed (3 functions)
- [ ] S3 bucket contains web files

### Backend Testing
- [ ] Chat sends message successfully
- [ ] Response streams back
- [ ] HTML plan generated
- [ ] Plan saved to database
- [ ] API endpoints return data:
  - [ ] GET /api/plans
  - [ ] GET /api/conversations
  - [ ] POST /api/chat

## iOS App Development

### Xcode Project Creation
- [ ] Xcode opened
- [ ] New project created (iOS → App)
- [ ] Project settings:
  - [ ] Product Name: PhotoScout
  - [ ] Team selected
  - [ ] Organization ID set
  - [ ] Interface: SwiftUI
  - [ ] Language: Swift
- [ ] Project saved in `ios/PhotoScout/`

### File Structure
- [ ] Groups created:
  - [ ] Views
  - [ ] Components
  - [ ] Models
  - [ ] Services
  - [ ] (optional) docs folder added

### Swift Files Added
**Root Level:**
- [ ] PhotoScoutApp.swift (replace existing)
- [ ] MainTabView.swift
- [ ] Config.swift

**Views:**
- [ ] ChatTab.swift
- [ ] PlansTab.swift
- [ ] PlanDetailView.swift
- [ ] HistoryTab.swift
- [ ] ConversationDetailView.swift

**Components:**
- [ ] WebView.swift
- [ ] PlanRow.swift
- [ ] ConversationRow.swift

**Models:**
- [ ] Plan.swift
- [ ] Conversation.swift

**Services:**
- [ ] APIService.swift

### Configuration
- [ ] Config.swift updated with CloudFront URL
  ```swift
  static let apiBaseURL = "https://YOUR_DOMAIN_HERE"
  ```
- [ ] Info.plist updated (ITSAppUsesNonExemptEncryption = NO)
- [ ] Signing configured (Team selected)
- [ ] Bundle ID set (auto-generated or custom)

### Local Testing
- [ ] Simulator selected (iPhone 15 Pro)
- [ ] Build succeeds (Cmd+B)
- [ ] App runs (Cmd+R)
- [ ] All tabs visible
- [ ] Chat tab loads web view
- [ ] Plans tab shows empty state
- [ ] History tab shows empty state

### Functionality Testing
- [ ] Chat sends message
- [ ] Response streams back
- [ ] Plan appears in Plans tab (after chat)
- [ ] Pull-to-refresh works
- [ ] Share button works
- [ ] Navigation works between tabs
- [ ] Back navigation works

## TestFlight Deployment

### Pre-Archive
- [ ] Device target selected (Any iOS Device)
- [ ] Scheme set to Release (if needed)
- [ ] Version/build number incremented (if re-uploading)

### Archive
- [ ] Product → Archive initiated
- [ ] Archive completed successfully
- [ ] Organizer opened automatically
- [ ] Archive appears in list

### Distribution
- [ ] Archive selected
- [ ] "Distribute App" clicked
- [ ] "App Store Connect" selected
- [ ] "Upload" selected
- [ ] Upload completed

### App Store Connect
- [ ] Logged into [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] App selected (or created if first time)
- [ ] TestFlight tab opened
- [ ] Build processing completed (~10-15 min)
- [ ] Build ready for testing

### Tester Setup
**Internal Testing:**
- [ ] Internal Testing group created/selected
- [ ] Testers added by email
- [ ] Test information filled out

**External Testing (Optional):**
- [ ] External Testing group created
- [ ] Testers added
- [ ] Build submitted for review
- [ ] Review approved (can take 1-2 days)

### Device Testing
- [ ] TestFlight app installed on iPhone
- [ ] Invite email received
- [ ] PhotoScout installed from TestFlight
- [ ] App launches successfully
- [ ] Chat works on device
- [ ] Plans save and load
- [ ] History shows conversations
- [ ] No crashes or errors

## Post-Deployment

### Monitoring Setup
- [ ] CloudWatch dashboard created (optional)
- [ ] Billing alerts configured
- [ ] Error alerts configured (optional)

### Documentation
- [ ] CloudFront URL documented
- [ ] TestFlight invite link saved
- [ ] Known issues documented

### Feedback Collection
- [ ] Feedback form/email set up
- [ ] Beta testers contacted
- [ ] Feedback tracking system ready

## Health Checks

### Daily (First Week)
- [ ] Check CloudWatch for Lambda errors
- [ ] Monitor DynamoDB table sizes
- [ ] Review user feedback
- [ ] Check AWS billing

### Weekly
- [ ] Review conversation quality
- [ ] Update prompts if needed
- [ ] Deploy improvements
- [ ] Increment TestFlight build

## Rollback Plan

If issues occur:
- [ ] Previous CloudFormation stack version noted
- [ ] Rollback command ready:
  ```bash
  cd infra
  pnpm cdk deploy --rollback
  ```
- [ ] Previous iOS build archived

## Success Criteria

- [ ] ✅ Backend deployed and accessible
- [ ] ✅ Web app works in browser
- [ ] ✅ iOS app on TestFlight
- [ ] ✅ Chat functionality working
- [ ] ✅ Plans saving/loading
- [ ] ✅ No critical bugs
- [ ] ✅ Positive user feedback
- [ ] ✅ Costs within budget

## Issues Log

| Date | Issue | Solution | Status |
|------|-------|----------|--------|
| | | | |

## Notes

```
Add deployment notes here:
- CloudFront URL:
- TestFlight Link:
- First deploy date:
- Latest build number:
- Known issues:
```

---

**Estimated Time:** 2-3 hours total
**Status:** [ ] Not Started [ ] In Progress [ ] Completed
**Deployed By:** _______________
**Date:** _______________
