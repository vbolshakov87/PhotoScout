//
//  PlanDetailView.swift
//  PhotoScout
//
//  Detail view for displaying a photo trip plan with HTML content
//

import SwiftUI
import WebKit

struct PlanDetailView: View {
    @Environment(\.dismiss) var dismiss
    let plan: Plan
    @State private var fullPlan: Plan?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
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
                } else if let htmlUrl = fullPlan?.htmlUrl, let url = URL(string: htmlUrl) {
                    WebView(url: url)
                        .ignoresSafeArea(.all, edges: .bottom)
                } else if let htmlContent = fullPlan?.htmlContent {
                    HTMLView(htmlContent: htmlContent)
                        .ignoresSafeArea(.all, edges: .bottom)
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
            .navigationTitle(plan.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        if let htmlUrl = fullPlan?.htmlUrl, let url = URL(string: htmlUrl) {
                            Button {
                                UIApplication.shared.open(url)
                            } label: {
                                Image(systemName: "safari")
                            }
                            
                            Button {
                                printPlan()
                            } label: {
                                Image(systemName: "printer")
                            }
                            
                            ShareLink(item: url) {
                                Image(systemName: "square.and.arrow.up")
                            }
                        } else if let htmlContent = fullPlan?.htmlContent {
                            ShareLink(item: htmlContent) {
                                Image(systemName: "square.and.arrow.up")
                            }
                        }
                    }
                }
            }
        }
        .task {
            await loadFullPlan()
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

    private func printPlan() {
        guard let htmlUrl = fullPlan?.htmlUrl, let url = URL(string: htmlUrl) else { return }
        
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.jobName = plan.title
        printInfo.outputType = .general
        
        let printController = UIPrintInteractionController.shared
        printController.printInfo = printInfo
        printController.printPageRenderer = nil
        
        // Use the URL to print the webpage
        printController.printingItem = url
        
        printController.present(animated: true, completionHandler: nil)
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
            dates: nil,
            spotCount: 8,
            createdAt: Date().timeIntervalSince1970 * 1000,
            htmlUrl: nil,
            htmlContent: nil
        ))
    }
}
