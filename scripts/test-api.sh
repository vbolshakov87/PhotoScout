#!/bin/bash

# PhotoScout API Test Script
# Test all API endpoints with sample data

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
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

# Load URLs from CDK outputs
if [ ! -f cdk-outputs.json ]; then
    log_error "cdk-outputs.json not found"
    log_info "Run ./deploy.sh first to deploy the stack"
    exit 1
fi

CHAT_API_URL=$(grep -o '"ChatApiUrl": "[^"]*"' cdk-outputs.json | sed 's/"ChatApiUrl": "\([^"]*\)"/\1/')
CONVERSATIONS_API_URL=$(grep -o '"ConversationsApiUrl": "[^"]*"' cdk-outputs.json | sed 's/"ConversationsApiUrl": "\([^"]*\)"/\1/')
PLANS_API_URL=$(grep -o '"PlansApiUrl": "[^"]*"' cdk-outputs.json | sed 's/"PlansApiUrl": "\([^"]*\)"/\1/')
WEB_URL=$(grep -o '"DistributionUrl": "[^"]*"' cdk-outputs.json | sed 's/"DistributionUrl": "\([^"]*\)"/\1/')

# Generate test visitor ID
VISITOR_ID="test-$(date +%s)"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║              PhotoScout API Test Suite                    ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Test Visitor ID: $VISITOR_ID"
echo ""

# Test 1: Chat API
log_section "Test 1: Chat API (Streaming)"

log_info "Sending message to chat endpoint..."
echo ""

CHAT_RESPONSE=$(curl -s -X POST "$CHAT_API_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"visitorId\":\"$VISITOR_ID\",\"message\":\"Hello, can you help me plan a photo trip?\"}" \
    --max-time 30)

if echo "$CHAT_RESPONSE" | grep -q "data:"; then
    log_success "Chat endpoint is streaming responses"
    echo ""
    echo "Sample response:"
    echo "$CHAT_RESPONSE" | head -5
    echo "..."
elif echo "$CHAT_RESPONSE" | grep -q "error"; then
    log_error "Chat endpoint returned an error:"
    echo "$CHAT_RESPONSE" | jq '.' 2>/dev/null || echo "$CHAT_RESPONSE"
else
    log_error "Unexpected response from chat endpoint"
    echo "$CHAT_RESPONSE"
fi

echo ""

# Test 2: List Conversations
log_section "Test 2: List Conversations"

log_info "Fetching conversations..."

CONVERSATIONS=$(curl -s "${CONVERSATIONS_API_URL}?visitorId=${VISITOR_ID}&limit=10")

if echo "$CONVERSATIONS" | grep -q "conversations"; then
    COUNT=$(echo "$CONVERSATIONS" | grep -o '"id"' | wc -l | xargs)
    log_success "Found $COUNT conversations"

    if [ "$COUNT" -gt 0 ]; then
        echo ""
        echo "Sample conversation:"
        echo "$CONVERSATIONS" | jq '.conversations[0]' 2>/dev/null || echo "$CONVERSATIONS" | head -10
    fi
else
    log_error "Failed to fetch conversations"
    echo "$CONVERSATIONS"
fi

echo ""

# Test 3: List Plans
log_section "Test 3: List Plans"

log_info "Fetching plans..."

PLANS=$(curl -s "${PLANS_API_URL}?visitorId=${VISITOR_ID}&limit=10")

if echo "$PLANS" | grep -q "plans"; then
    COUNT=$(echo "$PLANS" | grep -o '"id"' | wc -l | xargs)
    log_success "Found $COUNT plans"

    if [ "$COUNT" -gt 0 ]; then
        echo ""
        echo "Sample plan:"
        echo "$PLANS" | jq '.plans[0] | {id, city, title, spotCount, createdAt}' 2>/dev/null || echo "$PLANS" | head -10
    fi
else
    log_error "Failed to fetch plans"
    echo "$PLANS"
fi

echo ""

# Test 4: Web Frontend
log_section "Test 4: Web Frontend"

log_info "Checking web frontend..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "Web frontend is accessible (HTTP $HTTP_CODE)"
    log_info "Visit: $WEB_URL"
else
    log_error "Web frontend returned HTTP $HTTP_CODE"
fi

echo ""

# Summary
log_section "Test Summary"

echo "API Endpoints:"
echo -e "  ${BLUE}Chat:${NC} $CHAT_API_URL"
echo -e "  ${BLUE}Conversations:${NC} $CONVERSATIONS_API_URL"
echo -e "  ${BLUE}Plans:${NC} $PLANS_API_URL"
echo ""
echo "Frontend:"
echo -e "  ${BLUE}Web App:${NC} $WEB_URL"
echo ""
echo "Test User:"
echo -e "  ${BLUE}Visitor ID:${NC} $VISITOR_ID"
echo ""

log_info "To view logs, run: ./scripts/logs.sh chat"
echo ""
