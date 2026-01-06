#!/bin/bash

# PhotoScout Setup Verification Script
# Run this to verify all files are in place before deployment

echo "🔍 PhotoScout Setup Verification"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ MISSING: $1"
        ((ERRORS++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ MISSING: $1/"
        ((ERRORS++))
    fi
}

# Root files
echo "📁 Root Configuration:"
check_file "package.json"
check_file "pnpm-workspace.yaml"
check_file ".gitignore"
check_file ".nvmrc"
echo ""

# Documentation
echo "📚 Documentation:"
check_file "README.md"
check_file "QUICKSTART.md"
check_file "PROJECT_SUMMARY.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "PROJECT_STRUCTURE.txt"
check_file "docs/IOS_CODE.md"
echo ""

# Shared package
echo "📦 Shared Package:"
check_dir "packages/shared"
check_file "packages/shared/package.json"
check_file "packages/shared/tsconfig.json"
check_file "packages/shared/src/types.ts"
check_file "packages/shared/src/index.ts"
echo ""

# Web package
echo "🌐 Web Package:"
check_dir "packages/web"
check_file "packages/web/package.json"
check_file "packages/web/vite.config.ts"
check_file "packages/web/tailwind.config.js"
check_file "packages/web/index.html"
check_file "packages/web/src/App.tsx"
check_file "packages/web/src/main.tsx"
check_dir "packages/web/src/components/chat"
check_dir "packages/web/src/components/shared"
check_dir "packages/web/src/pages"
check_dir "packages/web/src/hooks"
check_dir "packages/web/src/lib"
echo ""

# API package
echo "⚡ API Package:"
check_dir "packages/api"
check_file "packages/api/package.json"
check_file "packages/api/tsconfig.json"
check_file "packages/api/src/handlers/chat.ts"
check_file "packages/api/src/handlers/conversations.ts"
check_file "packages/api/src/handlers/plans.ts"
check_file "packages/api/src/lib/anthropic.ts"
check_file "packages/api/src/lib/dynamo.ts"
check_file "packages/api/src/lib/prompts.ts"
echo ""

# Infrastructure
echo "🏗️ Infrastructure:"
check_dir "infra"
check_file "infra/package.json"
check_file "infra/cdk.json"
check_file "infra/bin/infra.ts"
check_file "infra/lib/photoscout-stack.ts"
echo ""

# Check for node_modules
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo "✅ Root node_modules exists"
else
    echo "⚠️  Run 'pnpm install' to install dependencies"
    ((WARNINGS++))
fi

if [ -d "packages/shared/node_modules" ]; then
    echo "✅ Shared node_modules exists"
else
    echo "⚠️  Shared package dependencies not installed"
    ((WARNINGS++))
fi
echo ""

# Check for build outputs
echo "🔨 Build Outputs:"
if [ -d "packages/shared/dist" ]; then
    echo "✅ Shared package built"
else
    echo "⚠️  Run 'pnpm --filter @photoscout/shared build' to build shared package"
    ((WARNINGS++))
fi
echo ""

# Prerequisites check
echo "🔧 Prerequisites:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
    if [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v21* ]] || [[ $NODE_VERSION == v22* ]]; then
        echo "   ✅ Version compatible (20+)"
    else
        echo "   ⚠️  Version may be incompatible (need 20+)"
        ((WARNINGS++))
    fi
else
    echo "❌ Node.js not found"
    ((ERRORS++))
fi

if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm installed: $PNPM_VERSION"
else
    echo "❌ pnpm not found - run: npm install -g pnpm"
    ((ERRORS++))
fi

if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
    echo "✅ AWS CLI installed: $AWS_VERSION"
else
    echo "⚠️  AWS CLI not found (needed for deployment)"
    ((WARNINGS++))
fi

if command -v cdk &> /dev/null; then
    CDK_VERSION=$(cdk --version)
    echo "✅ AWS CDK installed: $CDK_VERSION"
else
    echo "⚠️  AWS CDK not found - run: npm install -g aws-cdk"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "=================================="
echo "📊 Verification Summary"
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ No errors found!"
else
    echo "❌ Found $ERRORS error(s)"
fi

if [ $WARNINGS -eq 0 ]; then
    echo "✅ No warnings"
else
    echo "⚠️  Found $WARNINGS warning(s)"
fi
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "1. pnpm install (if not done)"
    echo "2. pnpm build"
    echo "3. Follow QUICKSTART.md for deployment"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Setup mostly complete but has warnings."
    echo "Review warnings above before deploying."
    exit 0
else
    echo "❌ Setup incomplete. Fix errors above."
    exit 1
fi
