#!/bin/bash

# PhotoScout Deployment Script
# Deploys CDK infrastructure, backend Lambda functions, and web frontend
#
# Usage:
#   ./deploy.sh              Run full deployment with tests
#   ./deploy.sh --skip-tests Skip integration tests

set -e  # Exit on error

# Handle --help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "PhotoScout Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running integration tests before deployment"
    echo "  --help, -h      Show this help message"
    echo ""
    exit 0
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions for colored output
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if .env file exists
check_env_file() {
    log_section "Checking Environment Configuration"

    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log_info "Creating .env from .env.example..."

        if [ -f .env.example ]; then
            cp .env.example .env
            log_warning "Please edit .env file and add your ANTHROPIC_API_KEY"
            log_info "Get your API key from: https://console.anthropic.com/settings/keys"
            exit 1
        else
            log_error ".env.example not found!"
            exit 1
        fi
    fi

    # Check if ANTHROPIC_API_KEY is set
    if ! grep -q "ANTHROPIC_API_KEY=sk-ant-" .env; then
        log_warning "ANTHROPIC_API_KEY may not be set correctly in .env"
        log_info "Make sure it starts with: sk-ant-"
    else
        log_success ".env file configured"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js $(node --version)"

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Install with: npm install -g pnpm"
        exit 1
    fi
    log_success "pnpm $(pnpm --version)"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    log_success "AWS CLI $(aws --version | cut -d' ' -f1)"

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region || echo "eu-central-1")
    log_success "AWS Account: $ACCOUNT_ID"
    log_success "AWS Region: $REGION"

    # Check CDK
    if ! command -v cdk &> /dev/null; then
        log_error "AWS CDK is not installed. Install with: npm install -g aws-cdk"
        exit 1
    fi
    log_success "AWS CDK $(cdk --version | cut -d' ' -f1)"
}

# Install dependencies
install_dependencies() {
    log_section "Installing Dependencies"

    log_info "Running pnpm install..."
    pnpm install

    log_success "Dependencies installed"
}

# Run integration tests
run_integration_tests() {
    log_section "Running Integration Tests"

    # Check if --skip-tests flag is passed
    if [[ "$*" == *"--skip-tests"* ]]; then
        log_warning "Skipping integration tests (--skip-tests flag)"
        return 0
    fi

    log_info "Running prompt integration tests..."

    cd packages/api
    if pnpm test:prompt; then
        log_success "All integration tests passed!"
    else
        log_error "Integration tests failed!"
        log_error "Fix the failing tests before deploying."
        log_info "Run 'cd packages/api && pnpm test:prompt' to debug."
        exit 1
    fi
    cd ../..
}

# Build all packages
build_packages() {
    log_section "Building All Packages"

    log_info "Building shared package..."
    pnpm --filter @photoscout/shared build

    log_info "Building API package..."
    pnpm --filter @photoscout/api build

    log_info "Building web package..."
    pnpm --filter @photoscout/web build

    log_info "Building infrastructure package..."
    pnpm --filter @photoscout/infra build

    log_success "All packages built successfully"
}

# Deploy CDK stack
deploy_infrastructure() {
    log_section "Deploying Infrastructure"

    log_info "Deploying CDK stack..."
    cd infra

    # Check if CDK is bootstrapped
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
        log_warning "CDK not bootstrapped in this region"
        log_info "Bootstrapping CDK..."
        cdk bootstrap aws://$ACCOUNT_ID/$REGION
    fi

    # Deploy the stack
    pnpm cdk deploy --require-approval never --outputs-file ../cdk-outputs.json

    cd ..

    log_success "Infrastructure deployed"
}

# Invalidate CloudFront cache
invalidate_cloudfront_cache() {
    log_section "Invalidating CloudFront Cache"

    if [ -f cdk-outputs.json ]; then
        # Extract CloudFront distribution ID from outputs
        CLOUDFRONT_URL=$(grep -o '"DistributionUrl": "[^"]*"' cdk-outputs.json | sed 's/"DistributionUrl": "\([^"]*\)"/\1/')
        
        if [ -n "$CLOUDFRONT_URL" ]; then
            # Extract domain from URL
            CLOUDFRONT_DOMAIN=$(echo "$CLOUDFRONT_URL" | sed 's|https://||' | sed 's|/.*||')
            
            # Get distribution ID from domain
            DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$CLOUDFRONT_DOMAIN'].Id" --output text)
            
            if [ -n "$DISTRIBUTION_ID" ]; then
                log_info "Invalidating CloudFront cache for distribution: $DISTRIBUTION_ID"
                
                # Invalidate all paths
                INVALIDATION_ID=$(aws cloudfront create-invalidation \
                    --distribution-id "$DISTRIBUTION_ID" \
                    --paths "/*" "/plans/*" \
                    --query 'Invalidation.Id' \
                    --output text)
                
                if [ -n "$INVALIDATION_ID" ]; then
                    log_success "Cache invalidation created: $INVALIDATION_ID"
                    log_info "Invalidation may take a few minutes to complete"
                else
                    log_warning "Failed to create cache invalidation"
                fi
            else
                log_warning "Could not find CloudFront distribution ID"
            fi
        fi
    else
        log_warning "Could not find cdk-outputs.json"
    fi
}

# Display deployment outputs
display_outputs() {
    log_section "Deployment Complete!"

    if [ -f cdk-outputs.json ]; then
        log_info "Extracting deployment URLs..."

        # Parse outputs using grep/sed (compatible with systems without jq)
        CLOUDFRONT_URL=$(grep -o '"DistributionUrl": "[^"]*"' cdk-outputs.json | sed 's/"DistributionUrl": "\([^"]*\)"/\1/')
        CHAT_API_URL=$(grep -o '"ChatApiUrl": "[^"]*"' cdk-outputs.json | sed 's/"ChatApiUrl": "\([^"]*\)"/\1/')

        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                    Deployment URLs                         ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        if [ -n "$CLOUDFRONT_URL" ]; then
            echo -e "${BLUE}Web App (CloudFront):${NC}"
            echo -e "  ${GREEN}$CLOUDFRONT_URL${NC}"
            echo ""
        fi

        if [ -n "$CHAT_API_URL" ]; then
            echo -e "${BLUE}Chat API (Lambda):${NC}"
            echo -e "  ${GREEN}$CHAT_API_URL${NC}"
            echo ""
        fi

        echo -e "${YELLOW}Next Steps:${NC}"
        echo -e "  1. Visit the web app URL to test the chat interface"
        echo -e "  2. Update iOS Config.swift with the CloudFront URL"
        echo -e "  3. Test the chat endpoint:"
        echo ""
        echo -e "     ${BLUE}curl -X POST '$CHAT_API_URL' \\${NC}"
        echo -e "       ${BLUE}-H 'Content-Type: application/json' \\${NC}"
        echo -e "       ${BLUE}-d '{\"visitorId\":\"test-123\",\"message\":\"Hello\"}'${NC}"
        echo ""

        # Save URLs to a file for easy reference
        cat > deployment-urls.txt << EOF
PhotoScout Deployment URLs
Generated: $(date)

Web App: $CLOUDFRONT_URL
Chat API: $CHAT_API_URL

iOS Configuration:
Update ios/PhotoScout/PhotoScout/Config.swift with:
static let apiBaseURL = "$CLOUDFRONT_URL"
EOF

        log_success "Deployment URLs saved to deployment-urls.txt"
    else
        log_warning "Could not find cdk-outputs.json"
    fi
}

# Test deployment
test_deployment() {
    log_section "Testing Deployment"

    if [ -f cdk-outputs.json ]; then
        CHAT_API_URL=$(grep -o '"ChatApiUrl": "[^"]*"' cdk-outputs.json | sed 's/"ChatApiUrl": "\([^"]*\)"/\1/')

        if [ -n "$CHAT_API_URL" ]; then
            log_info "Testing chat endpoint..."

            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CHAT_API_URL" \
                -H 'Content-Type: application/json' \
                -d '{"visitorId":"test-123","message":"Hello"}' \
                --max-time 10)

            if [ "$HTTP_CODE" = "200" ]; then
                log_success "Chat endpoint is responding (HTTP $HTTP_CODE)"
            else
                log_warning "Chat endpoint returned HTTP $HTTP_CODE"
                log_info "Check CloudWatch logs if you experience issues"
                log_info "Run: ./scripts/logs.sh chat"
            fi
        fi
    fi
}

# Main deployment flow
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}║              PhotoScout Deployment Script                 ║${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_env_file
    check_prerequisites
    install_dependencies
    run_integration_tests "$@"
    build_packages
    deploy_infrastructure
    invalidate_cloudfront_cache
    display_outputs
    test_deployment

    echo ""
    log_success "Deployment completed successfully!"
    echo ""
}

# Run main function with all arguments
main "$@"
