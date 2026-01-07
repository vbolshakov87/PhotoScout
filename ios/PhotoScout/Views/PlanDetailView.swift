//
//  PlanDetailView.swift
//  PhotoScout
//
//  Detail view for displaying a photo trip plan with HTML content
//

import SwiftUI
import WebKit

struct PlanDetailView: View {
    let plan: Plan
    @State private var fullPlan: Plan?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading plan...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)

                    Text("Error Loading Plan")
                        .font(.headline)

                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Button("Try Again") {
                        Task {
                            await loadFullPlan()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else if let htmlContent = fullPlan?.htmlContent {
                HTMLView(htmlContent: htmlContent)
                    .edgesIgnoringSafeArea(.bottom)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "map")
                        .font(.system(size: 50))
                        .foregroundColor(.gray)

                    Text("No plan content available")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle(plan.city)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadFullPlan()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let htmlContent = fullPlan?.htmlContent {
                    ShareLink(item: htmlContent) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
    }

    private func loadFullPlan() async {
        isLoading = true
        errorMessage = nil

        do {
            fullPlan = try await APIService.shared.fetchPlan(id: plan.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// WebView for rendering HTML content
struct HTMLView: UIViewRepresentable {
    let htmlContent: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.loadHTMLString(htmlContent, baseURL: nil)
    }
}

#Preview {
    NavigationView {
        PlanDetailView(plan: Plan(
            id: "1",
            city: "Hamburg",
            title: "Hamburg Photo Trip",
            spotCount: 8,
            createdAt: Date().timeIntervalSince1970 * 1000,
            htmlContent: nil
        ))
    }
}
