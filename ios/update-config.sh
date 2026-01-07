#!/bin/bash

# Update Config.swift with CloudFront URL from CDK outputs

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CDK_OUTPUTS="$PROJECT_ROOT/cdk-outputs.json"
CONFIG_FILE="$SCRIPT_DIR/PhotoScout/Config.swift"

if [ ! -f "$CDK_OUTPUTS" ]; then
    echo "Error: cdk-outputs.json not found"
    echo "Run deployment first: cd $PROJECT_ROOT && ./deploy.sh"
    exit 1
fi

# Extract CloudFront URL
CLOUDFRONT_URL=$(grep -o '"DistributionUrl": "[^"]*"' "$CDK_OUTPUTS" | sed 's/"DistributionUrl": "\([^"]*\)"/\1/')

if [ -z "$CLOUDFRONT_URL" ]; then
    echo "Error: Could not extract CloudFront URL from cdk-outputs.json"
    exit 1
fi

echo "Found CloudFront URL: $CLOUDFRONT_URL"

# Update Config.swift
cat > "$CONFIG_FILE" << EOF
//
//  Config.swift
//  PhotoScout
//
//  Configuration for API and web app URLs
//

import Foundation

struct Config {
    // CloudFront distribution URL for the web app
    static let webAppURL = "$CLOUDFRONT_URL"

    // API base URL (same as web app for production)
    static let apiBaseURL = "$CLOUDFRONT_URL/api"

    // For local development, uncomment and use:
    // static let webAppURL = "http://localhost:5173"
    // static let apiBaseURL = "http://localhost:5173/api"
}
EOF

echo "✓ Updated Config.swift with CloudFront URL"
echo ""
echo "Config.swift now points to:"
echo "  Web App: $CLOUDFRONT_URL"
echo "  API:     $CLOUDFRONT_URL/api"
