//
//  ChatTab.swift
//  PhotoScout
//
//  Chat interface using WebView with native auth injection
//

import SwiftUI

struct ChatTab: View {
    @ObservedObject private var authService = AuthenticationService.shared
    
    // Build URL with native auth parameters
    private var webAppURL: URL? {
        guard var components = URLComponents(string: Config.webAppURL) else {
            return nil
        }
        
        // Add native auth parameters
        var queryItems = components.queryItems ?? []
        queryItems.append(URLQueryItem(name: "nativeAuth", value: "true"))
        
        if let userId = authService.userId {
            queryItems.append(URLQueryItem(name: "userId", value: userId))
        }
        if let userName = authService.userName {
            queryItems.append(URLQueryItem(name: "userName", value: userName))
        }
        if let userEmail = authService.userEmail {
            queryItems.append(URLQueryItem(name: "userEmail", value: userEmail))
        }
        if let userPhoto = authService.userPhotoURL {
            queryItems.append(URLQueryItem(name: "userPhoto", value: userPhoto))
        }
        
        components.queryItems = queryItems
        return components.url
    }
    
    var body: some View {
        if let url = webAppURL {
            AuthenticatedWebView(url: url)
                .ignoresSafeArea(edges: [.bottom])
        } else {
            VStack(spacing: 20) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)

                Text("Configuration Error")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Invalid web app URL in Config.swift")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Text(Config.webAppURL)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
            }
            .padding()
        }
    }
}

#Preview {
    ChatTab()
}
