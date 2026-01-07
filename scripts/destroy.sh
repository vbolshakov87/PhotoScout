#!/bin/bash

# PhotoScout Destroy Script
# Removes all AWS resources created by CDK

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

echo ""
echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                                                            ║${NC}"
echo -e "${RED}║           PhotoScout Infrastructure Destroy               ║${NC}"
echo -e "${RED}║                                                            ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_warning "This will delete ALL PhotoScout resources from AWS:"
echo ""
echo "  • Lambda functions (chat, conversations, plans)"
echo "  • DynamoDB tables (messages, conversations, plans)"
echo "  • S3 bucket and all uploaded files"
echo "  • CloudFront distribution"
echo "  • All related IAM roles and policies"
echo ""
log_warning "This action CANNOT be undone!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to destroy the PhotoScout stack? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Destruction cancelled"
    exit 0
fi

echo ""
log_warning "Last chance! Type 'DESTROY' to proceed:"
read -p "> " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "DESTROY" ]; then
    log_info "Destruction cancelled"
    exit 0
fi

echo ""
log_info "Destroying PhotoScout stack..."
echo ""

cd infra

# Destroy the stack
if pnpm cdk destroy --force; then
    cd ..

    echo ""
    log_success "PhotoScout stack destroyed successfully"

    # Clean up local files
    if [ -f cdk-outputs.json ]; then
        rm cdk-outputs.json
        log_info "Removed cdk-outputs.json"
    fi

    if [ -f deployment-urls.txt ]; then
        rm deployment-urls.txt
        log_info "Removed deployment-urls.txt"
    fi

    echo ""
    log_info "All AWS resources have been deleted"
    log_info "Local code and configuration remain intact"
    echo ""
else
    cd ..
    log_error "Failed to destroy stack"
    log_info "You may need to manually delete resources in AWS Console"
    exit 1
fi
