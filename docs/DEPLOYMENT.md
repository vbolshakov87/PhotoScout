# Deployment Guide

Complete guide for deploying PhotoScout to AWS and distributing the iOS app.

## Prerequisites

### Required Tools

```bash
# Node.js 20+
node --version  # Should be 20.x or higher

# pnpm
npm install -g pnpm

# AWS CLI
aws --version

# AWS CDK
npm install -g aws-cdk

# Xcode (for iOS)
xcode-select --version
```

### AWS Configuration

```bash
# Configure AWS credentials
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Environment Variables

Create `.env` in project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional
DEEPSEEK_API_KEY=sk-xxxxx
ENVIRONMENT=production
AWS_REGION=eu-central-1
```

## Backend Deployment

### Automated Deployment

```bash
# Make script executable (first time)
chmod +x deploy.sh

# Deploy everything
./deploy.sh
```

This script will:
1. Check prerequisites
2. Install dependencies (`pnpm install`)
3. Build all packages
   - Shared types
   - API Lambda functions
   - Web React app
4. Deploy infrastructure via CDK
5. Output CloudFront URL

### Manual Deployment

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Deploy infrastructure
cd infra
pnpm cdk deploy --require-approval never
```

### Deployment Output

After successful deployment:

```bash
# View outputs
cat cdk-outputs.json

{
  "PhotoScoutStack": {
    "ChatApiUrl": "https://xxx.lambda-url.eu-central-1.on.aws/",
    "ConversationsApiUrl": "https://yyy.lambda-url.eu-central-1.on.aws/",
    "PlansApiUrl": "https://zzz.lambda-url.eu-central-1.on.aws/",
    "DistributionUrl": "https://aiscout.photo",
    "HtmlPlansCloudFrontUrl": "https://aiscout.photo/plans/",
    "CloudFrontDomain": "aiscout.photo"
  }
}
```

## iOS App Deployment

### Update Configuration

After backend deployment:

```bash
cd ios
./update-config.sh
```

This updates `Config.swift` with CloudFront URLs.

### Build in Xcode

1. Open project:
   ```bash
   open ios/PhotoScout/PhotoScout.xcodeproj
   ```

2. Select target device/simulator

3. Build and run (⌘R)

### Archive for Distribution

1. **Product → Archive** in Xcode

2. **Organizer** window opens

3. Select archive → **Distribute App**

4. Choose distribution method:
   - **TestFlight & App Store**
   - **Ad Hoc** (for device testing)
   - **Development**

5. Follow prompts to upload to App Store Connect

See [../ios/TESTFLIGHT.md](../ios/TESTFLIGHT.md) for detailed TestFlight setup.

## Verification

### Test Backend

```bash
# Test chat endpoint
curl -N 'https://YOUR_CLOUDFRONT_URL/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":"Hello"}'

# Test conversations
curl 'https://YOUR_CLOUDFRONT_URL/api/conversations?visitorId=test'

# Test plans
curl 'https://YOUR_CLOUDFRONT_URL/api/plans?visitorId=test'
```

### Test Web App

Visit your CloudFront URL in browser:
```
https://aiscout.photo
```

### Test iOS App

1. Install on device/simulator
2. Sign in with Google
3. Create photo trip plan
4. Verify in Trips tab
5. Check conversation in History tab

## Infrastructure Details

### AWS Resources Created

**Lambda Functions:**
- `PhotoScoutStack-ChatFunction-xxx` (512 MB, 120s timeout)
- `PhotoScoutStack-ConversationsFunction-xxx` (256 MB, 30s timeout)
- `PhotoScoutStack-PlansFunction-xxx` (256 MB, 30s timeout)

**DynamoDB Tables:**
- `photoscout-messages` (On-Demand, TTL 30 days)
- `photoscout-conversations` (On-Demand, TTL 30 days)
- `photoscout-plans` (On-Demand, TTL 90 days)
- `photoscout-users` (On-Demand)

**S3 Buckets:**
- `photoscout-web-{accountId}` (Web app files)
- `photoscout-plans-{accountId}` (HTML plans)

**CloudFront:**
- Distribution with multiple behaviors
- Origin Access Control for S3
- Function URLs for Lambda

### Stack Name

```
PhotoScoutStack
```

## Environment Management

### Development Environment

`.env`:
```bash
ENVIRONMENT=development
DEEPSEEK_API_KEY=sk-xxxxx  # Cheaper for testing
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Production Environment

`.env`:
```bash
ENVIRONMENT=production
ANTHROPIC_API_KEY=sk-ant-xxxxx
# No DEEPSEEK_API_KEY - uses Claude only
```

## Custom Domain Setup

### 1. Request Certificate

```bash
# In ACM (us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Update Stack

Edit `infra/lib/photoscout-stack.ts`:

```typescript
// Import certificate
const cert = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  'arn:aws:acm:us-east-1:xxx:certificate/xxx'
);

// Update CloudFront distribution
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  domainNames: ['app.yourdomain.com'],
  certificate: cert,
  // ... rest of config
});
```

### 3. Create DNS Record

Add CNAME in your DNS:
```
app.yourdomain.com → aiscout.photo
```

### 4. Redeploy

```bash
pnpm deploy
```

## Monitoring

### CloudWatch Logs

```bash
# View logs
./scripts/logs.sh chat
./scripts/logs.sh conversations
./scripts/logs.sh plans

# Follow live
./scripts/logs.sh chat --follow
```

### CloudWatch Metrics

Navigate to CloudWatch console:
- Lambda invocations
- Lambda errors
- Lambda duration
- DynamoDB read/write capacity
- CloudFront requests

### Alarms (Recommended)

```typescript
// Add to infra stack
const alarm = new cloudwatch.Alarm(this, 'ChatErrors', {
  metric: chatFunction.metricErrors(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'Chat function error rate'
});
```

## Rollback

### Backend Rollback

```bash
# View previous deployments
aws cloudformation describe-stacks \
  --stack-name PhotoScoutStack

# Rollback to previous version
aws cloudformation rollback-stack \
  --stack-name PhotoScoutStack
```

### iOS Rollback

In App Store Connect:
1. Navigate to app version
2. Select previous version
3. Submit for review
4. Release

## Cleanup

### Remove All Resources

```bash
# WARNING: Deletes all data permanently
./scripts/destroy.sh
```

Or manually:
```bash
cd infra
pnpm cdk destroy
```

This removes:
- All Lambda functions
- All DynamoDB tables (data lost)
- All S3 buckets (data lost)
- CloudFront distribution

## Cost Optimization

### Current Configuration

- **Lambda**: Pay per request
- **DynamoDB**: On-demand billing
- **S3**: Pay per GB stored
- **CloudFront**: Pay per request/GB

**Estimated**: <$5/month for low-moderate usage

### Optimization Tips

1. **Enable CloudFront Caching**
   ```typescript
   cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
   ```

2. **Use Reserved Capacity** (if predictable load)
   ```typescript
   billingMode: dynamodb.BillingMode.PROVISIONED,
   readCapacity: 5,
   writeCapacity: 5
   ```

3. **Reduce Lambda Memory** (if possible)
   ```typescript
   memorySize: 256  // Instead of 512
   ```

4. **S3 Lifecycle Policies**
   ```typescript
   lifecycleRules: [{
     expiration: cdk.Duration.days(90)
   }]
   ```

## Troubleshooting

### Deployment Fails

**"Stack already exists"**
```bash
# Update existing stack
pnpm deploy
```

**"Insufficient permissions"**
```bash
# Check IAM permissions
aws iam get-user
```

**"CDK version mismatch"**
```bash
# Update CDK
npm install -g aws-cdk@latest
cd infra && pnpm install
```

### Runtime Errors

**"Function timeout"**
- Increase Lambda timeout in stack
- Optimize function code
- Check CloudWatch logs

**"DynamoDB throttling"**
- Switch to on-demand billing
- Or increase provisioned capacity

**"CORS errors"**
- Check Lambda CORS headers
- Verify CloudFront behavior

### iOS Build Fails

```bash
# Update configuration
cd ios && ./update-config.sh

# Clean build
# Xcode: Product → Clean Build Folder (⇧⌘K)
```

## Production Checklist

### Backend

- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Use Claude Sonnet 4 (not DeepSeek)
- [ ] Configure custom domain
- [ ] Update CORS for specific origins
- [ ] Set up CloudWatch alarms
- [ ] Enable AWS WAF (optional)
- [ ] Configure backup for DynamoDB
- [ ] Set up cost alerts

### Frontend

- [ ] Update API URLs in Config.swift
- [ ] Test all features thoroughly
- [ ] Enable analytics (optional)
- [ ] Set up crash reporting
- [ ] Configure App Store listing
- [ ] Prepare marketing materials
- [ ] Submit for App Store review

### Security

- [ ] Rotate API keys regularly
- [ ] Enable CloudTrail logging
- [ ] Review IAM permissions
- [ ] Configure VPC (optional)
- [ ] Enable encryption at rest
- [ ] Set up WAF rules

## Continuous Deployment

### GitHub Actions (Example)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: pnpm deploy
```

## Support

- Documentation: [../docs/](../docs/)
- GitHub: [Issues](https://github.com/yourusername/PhotoScout/issues)
- Email: vbolshakov87@gmail.com

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
