#!/bin/bash

# PhotoScout Log Viewer
# Quickly view CloudWatch logs for Lambda functions

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

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to find log group for a function
find_log_group() {
    local function_name=$1
    aws logs describe-log-groups \
        --log-group-name-prefix "/aws/lambda/PhotoScoutStack-${function_name}" \
        --query 'logGroups[0].logGroupName' \
        --output text 2>/dev/null
}

# Display usage
usage() {
    echo "Usage: $0 <function> [options]"
    echo ""
    echo "Functions:"
    echo "  chat          - View chat function logs"
    echo "  conversations - View conversations function logs"
    echo "  plans         - View plans function logs"
    echo ""
    echo "Options:"
    echo "  --follow      - Follow logs in real-time (default: last 10 minutes)"
    echo "  --errors      - Show only ERROR logs"
    echo "  --since <time> - Show logs since (e.g., 5m, 1h, 2d)"
    echo ""
    echo "Examples:"
    echo "  $0 chat"
    echo "  $0 chat --follow"
    echo "  $0 chat --errors"
    echo "  $0 chat --since 1h"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    usage
fi

FUNCTION=$1
shift

# Map function names
case $FUNCTION in
    chat)
        FUNCTION_PREFIX="ChatFunction"
        ;;
    conversations)
        FUNCTION_PREFIX="ConversationsFunction"
        ;;
    plans)
        FUNCTION_PREFIX="PlansFunction"
        ;;
    *)
        log_error "Unknown function: $FUNCTION"
        usage
        ;;
esac

# Find log group
log_info "Finding log group for $FUNCTION..."
LOG_GROUP=$(find_log_group "$FUNCTION_PREFIX")

if [ -z "$LOG_GROUP" ] || [ "$LOG_GROUP" = "None" ]; then
    log_error "Could not find log group for $FUNCTION_PREFIX"
    log_info "Make sure the function is deployed"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found log group: $LOG_GROUP"
echo ""

# Parse options
FOLLOW=false
ERRORS=false
SINCE="10m"

while [ $# -gt 0 ]; do
    case $1 in
        --follow)
            FOLLOW=true
            shift
            ;;
        --errors)
            ERRORS=true
            shift
            ;;
        --since)
            SINCE="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Build command
if [ "$ERRORS" = true ]; then
    log_info "Showing ERROR logs from last $SINCE..."
    aws logs filter-log-events \
        --log-group-name "$LOG_GROUP" \
        --filter-pattern "ERROR" \
        --start-time $(($(date +%s) - $(echo $SINCE | sed 's/m/*60/;s/h/*3600/;s/d/*86400/' | bc)))000
elif [ "$FOLLOW" = true ]; then
    log_info "Following logs (Ctrl+C to stop)..."
    aws logs tail "$LOG_GROUP" --follow
else
    log_info "Showing logs from last $SINCE..."
    aws logs tail "$LOG_GROUP" --since "$SINCE"
fi
