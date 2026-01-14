#!/bin/bash
#
# PhotoScout Model Testing - Quick Test Script
#
# Usage:
#   ./quick-test.sh              Run all tests
#   ./quick-test.sh quality      Run quality tests only
#   ./quick-test.sh compliance   Run compliance tests only
#   ./quick-test.sh model haiku  Test specific model
#

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load env from project root
if [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | xargs)
    echo -e "${GREEN}✓${NC} Loaded .env from project root"
fi

# Check for required env vars
check_keys() {
    local missing=0
    [ -z "$ANTHROPIC_API_KEY" ] && echo -e "${YELLOW}⚠${NC} ANTHROPIC_API_KEY not set" && missing=1
    [ -z "$OPENAI_API_KEY" ] && echo -e "${YELLOW}⚠${NC} OPENAI_API_KEY not set" && missing=1
    [ -z "$DEEPSEEK_API_KEY" ] && echo -e "${YELLOW}⚠${NC} DEEPSEEK_API_KEY not set" && missing=1
    [ -z "$GEMINI_API_KEY" ] && echo -e "${YELLOW}⚠${NC} GEMINI_API_KEY not set" && missing=1
    return $missing
}

# Print usage
usage() {
    echo "PhotoScout Model Testing"
    echo ""
    echo "Usage:"
    echo "  ./quick-test.sh              Run all tests (compliance + quality)"
    echo "  ./quick-test.sh compliance   Run compliance tests only"
    echo "  ./quick-test.sh quality      Run quality tests only"
    echo "  ./quick-test.sh model <id>   Test specific model"
    echo "  ./quick-test.sh location <id> Test specific location (quality)"
    echo ""
    echo "Models:"
    echo "  gpt4o-mini   GPT-4o Mini (ultra-budget)"
    echo "  deepseek     DeepSeek V3.2 (ultra-budget)"
    echo "  gemini-flash Gemini 3 Flash (ultra-budget)"
    echo "  haiku-3-5    Claude Haiku 3.5 (budget)"
    echo "  haiku        Claude Haiku 4.5 (budget)"
    echo "  gpt4o        GPT-4o (quality)"
    echo "  sonnet       Claude Sonnet 4 (quality)"
    echo ""
    echo "Locations (quality tests):"
    echo "  lofoten      Lofoten, Norway"
    echo "  slovenia     Slovenia"
    echo "  paris        Paris, France"
}

# Main
case "${1:-all}" in
    compliance)
        echo -e "\n${CYAN}Running Compliance Tests...${NC}\n"
        check_keys || true
        npm run test
        ;;
    quality)
        echo -e "\n${CYAN}Running Quality Tests...${NC}\n"
        check_keys || true
        npm run quality
        ;;
    model)
        if [ -z "$2" ]; then
            echo "Error: Model ID required"
            echo "Usage: ./quick-test.sh model <model-id>"
            exit 1
        fi
        echo -e "\n${CYAN}Testing model: $2${NC}\n"
        check_keys || true
        npm run test -- --model "$2"
        npm run quality -- --model "$2"
        ;;
    location)
        if [ -z "$2" ]; then
            echo "Error: Location ID required"
            echo "Usage: ./quick-test.sh location <location-id>"
            exit 1
        fi
        echo -e "\n${CYAN}Testing location: $2${NC}\n"
        check_keys || true
        npm run quality -- --location "$2"
        ;;
    all)
        echo -e "\n${CYAN}Running All Tests...${NC}\n"
        check_keys || true
        echo -e "\n${CYAN}=== Compliance Tests ===${NC}\n"
        npm run test
        echo -e "\n${CYAN}=== Quality Tests ===${NC}\n"
        npm run quality
        echo -e "\n${GREEN}✓ All tests complete${NC}"
        echo -e "  Reports: results/report.html, results/quality-report.md"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo "Unknown command: $1"
        usage
        exit 1
        ;;
esac
