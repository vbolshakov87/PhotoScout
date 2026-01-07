# PhotoScout Deployment Scripts

Helper scripts for managing PhotoScout deployment and operations.

## Available Scripts

### 📦 deploy.sh (Root Directory)

**Location:** `/deploy.sh`

Automated deployment script that handles the entire deployment process.

**Usage:**
```bash
./deploy.sh
```

**What it does:**
1. ✓ Checks prerequisites (Node.js, pnpm, AWS CLI, CDK)
2. ✓ Validates `.env` file configuration
3. ✓ Installs all dependencies
4. ✓ Builds all packages (shared, api, web, infra)
5. ✓ Deploys CDK stack to AWS
6. ✓ Outputs deployment URLs
7. ✓ Tests the deployment
8. ✓ Saves URLs to `deployment-urls.txt`

**Prerequisites:**
- `.env` file with `ANTHROPIC_API_KEY`
- AWS CLI configured with credentials
- AWS CDK installed globally

---

### 📋 logs.sh

View CloudWatch logs for Lambda functions.

**Usage:**
```bash
./scripts/logs.sh <function> [options]
```

**Functions:**
- `chat` - Chat function logs
- `conversations` - Conversations function logs
- `plans` - Plans function logs

**Options:**
- `--follow` - Follow logs in real-time (like `tail -f`)
- `--errors` - Show only ERROR logs
- `--since <time>` - Show logs since time (e.g., `5m`, `1h`, `2d`)

**Examples:**
```bash
# View recent chat logs
./scripts/logs.sh chat

# Follow chat logs in real-time
./scripts/logs.sh chat --follow

# Show only errors from last hour
./scripts/logs.sh chat --errors --since 1h

# View conversations function logs
./scripts/logs.sh conversations
```

---

### 🧪 test-api.sh

Test all API endpoints with sample data.

**Usage:**
```bash
./scripts/test-api.sh
```

**What it tests:**
1. Chat API (streaming responses)
2. Conversations API (list/get)
3. Plans API (list/get)
4. Web frontend (accessibility)

**Output:**
- HTTP response codes
- Sample data from each endpoint
- Test visitor ID for tracking
- Summary of all endpoints

**Requirements:**
- `cdk-outputs.json` must exist (created by deployment)

---

### 💥 destroy.sh

Remove all AWS resources created by PhotoScout.

**Usage:**
```bash
./scripts/destroy.sh
```

**What it destroys:**
- Lambda functions (chat, conversations, plans)
- DynamoDB tables (messages, conversations, plans)
- S3 bucket and all files
- CloudFront distribution
- IAM roles and policies

**Safety:**
- Requires typing `yes` to confirm
- Requires typing `DESTROY` to final confirm
- Cannot be undone

**Local files preserved:**
- Source code
- `.env` file
- Configuration files

---

## Common Workflows

### First Time Deployment

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Add your ANTHROPIC_API_KEY

# 2. Deploy everything
./deploy.sh

# 3. Test deployment
./scripts/test-api.sh

# 4. Check logs
./scripts/logs.sh chat
```

### Development Iteration

```bash
# 1. Make code changes

# 2. Rebuild and deploy
pnpm build
pnpm deploy

# 3. Test changes
./scripts/test-api.sh

# 4. Monitor logs
./scripts/logs.sh chat --follow
```

### Debugging Issues

```bash
# 1. Check recent errors
./scripts/logs.sh chat --errors --since 30m

# 2. Follow logs in real-time
./scripts/logs.sh chat --follow

# 3. Test specific endpoint
curl -X POST 'https://your-lambda-url.on.aws/' \
  -H 'Content-Type: application/json' \
  -d '{"visitorId":"test","message":"Hello"}'
```

### Cleanup

```bash
# Remove all AWS resources
./scripts/destroy.sh
```

---

## Troubleshooting

### Script Permission Denied

```bash
chmod +x deploy.sh
chmod +x scripts/*.sh
```

### AWS Credentials Not Found

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region
```

### CDK Not Bootstrapped

The deploy script handles this automatically, but if needed manually:

```bash
cd infra
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Logs Not Found

If `logs.sh` reports log group not found:
- Ensure the stack is deployed: `./deploy.sh`
- Check stack status: `aws cloudformation describe-stacks --stack-name PhotoScoutStack`

---

## Script Details

### Exit Codes

All scripts use standard exit codes:
- `0` - Success
- `1` - Error/failure

### Output Colors

Scripts use colored output for clarity:
- 🔵 Blue (ℹ) - Information
- 🟢 Green (✓) - Success
- 🟡 Yellow (⚠) - Warning
- 🔴 Red (✗) - Error

### Dependencies

Scripts require:
- `bash` (standard on macOS/Linux)
- `aws` CLI
- `curl` (for test-api.sh)
- `grep`, `sed` (standard utilities)

---

## Contributing

When adding new scripts:

1. Make them executable: `chmod +x scripts/new-script.sh`
2. Add shebang: `#!/bin/bash`
3. Use `set -e` for error handling
4. Add colored output functions
5. Document usage in this README
6. Test on clean environment

---

## Support

For issues with scripts:
1. Check this README
2. Review main [README.md](../README.md) troubleshooting section
3. Check CloudWatch logs: `./scripts/logs.sh chat`
4. Report issues at: https://github.com/anthropics/claude-code/issues
