//
//  Config.swift
//  PhotoScout
//
//  Configuration for API and web app URLs
//

import Foundation

struct Config {
    // CloudFront distribution URL for the web app
    static let webAppURL = "https://d2mpt2trz11kx7.cloudfront.net"

    // API base URL (same as web app for production)
    static let apiBaseURL = "https://d2mpt2trz11kx7.cloudfront.net/api"

    // For local development, uncomment and use:
    // static let webAppURL = "http://localhost:5173"
    // static let apiBaseURL = "http://localhost:5173/api"
}
