//
//  ChatTab.swift
//  PhotoScout
//
//  Chat interface using WebView
//

import SwiftUI

struct ChatTab: View {
    var body: some View {
        NavigationView {
            if let url = URL(string: Config.webAppURL) {
                WebView(url: url)
                    .navigationTitle("Photo Scout")
                    .navigationBarTitleDisplayMode(.inline)
                    .edgesIgnoringSafeArea(.bottom)
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
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

#Preview {
    ChatTab()
}
