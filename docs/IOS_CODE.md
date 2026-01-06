# iOS Swift Code Reference

Complete Swift code for the PhotoScout iOS app. Create each file in Xcode and copy the corresponding code.

## Table of Contents
1. [PhotoScoutApp.swift](#photoscoutappswift) - App entry point
2. [MainTabView.swift](#maintabviewswift) - Tab navigation
3. [Config.swift](#configswift) - Configuration & utilities
4. [Views](#views)
5. [Components](#components)
6. [Models](#models)
7. [Services](#services)

---

## PhotoScoutApp.swift

```swift
import SwiftUI

@main
struct PhotoScoutApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

class AppState: ObservableObject {
    @Published var visitorId: String
    @Published var selectedTab: Tab = .chat
    @Published var navigateToPlan: String? = nil
    @Published var navigateToConversation: String? = nil

    enum Tab: Int {
        case chat = 0
        case plans = 1
        case history = 2
    }

    init() {
        if let stored = UserDefaults.standard.string(forKey: "visitorId") {
            self.visitorId = stored
        } else {
            let newId = UUID().uuidString
            UserDefaults.standard.set(newId, forKey: "visitorId")
            self.visitorId = newId
        }
    }
}
```

---

## MainTabView.swift

```swift
import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            ChatTab()
                .tabItem {
                    Label("Chat", systemImage: "message.fill")
                }
                .tag(AppState.Tab.chat)

            PlansTab()
                .tabItem {
                    Label("Plans", systemImage: "map.fill")
                }
                .tag(AppState.Tab.plans)

            HistoryTab()
                .tabItem {
                    Label("History", systemImage: "clock.fill")
                }
                .tag(AppState.Tab.history)
        }
        .tint(Color(hex: "3498db"))
    }
}
```

---

## Config.swift

```swift
import Foundation
import SwiftUI

enum Config {
    // IMPORTANT: Update this after CDK deployment!
    static let apiBaseURL = "https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"

    // For local development:
    // static let apiBaseURL = "http://localhost:5173"

    static func chatURL(visitorId: String) -> URL {
        URL(string: "\(apiBaseURL)/?visitorId=\(visitorId)")!
    }

    static func conversationURL(visitorId: String, conversationId: String) -> URL {
        URL(string: "\(apiBaseURL)/conversation/\(conversationId)?visitorId=\(visitorId)")!
    }

    static func planURL(visitorId: String, planId: String) -> URL {
        URL(string: "\(apiBaseURL)/api/plans/\(planId)/html?visitorId=\(visitorId)")!
    }
}

// Utility extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

---

## Views

### ChatTab.swift

```swift
import SwiftUI

struct ChatTab: View {
    @EnvironmentObject var appState: AppState
    @State private var isLoading = true
    @State private var webViewKey = UUID()

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                WebView(
                    url: Config.chatURL(visitorId: appState.visitorId),
                    isLoading: $isLoading,
                    onPlanSaved: { planId in
                        appState.navigateToPlan = planId
                        appState.selectedTab = .plans
                    }
                )
                .id(webViewKey)

                if isLoading {
                    LoadingView()
                }
            }
            .navigationTitle("PhotoScout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        webViewKey = UUID()
                        isLoading = true
                    } label: {
                        Image(systemName: "plus.message")
                    }
                }
            }
        }
    }
}
```

### PlansTab.swift

```swift
import SwiftUI

struct PlansTab: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = PlansViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                if viewModel.isLoading && viewModel.plans.isEmpty {
                    LoadingView()
                } else if viewModel.plans.isEmpty {
                    EmptyStateView(
                        icon: "map",
                        title: "No Plans Yet",
                        message: "Chat with PhotoScout to create your first photo trip plan"
                    ) {
                        appState.selectedTab = .chat
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.plans) { plan in
                                NavigationLink(value: plan) {
                                    PlanRow(plan: plan)
                                }
                            }

                            if viewModel.hasMore {
                                ProgressView()
                                    .onAppear {
                                        viewModel.loadMore(visitorId: appState.visitorId)
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("My Plans")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: Plan.self) { plan in
                PlanDetailView(plan: plan)
            }
            .onAppear {
                if viewModel.plans.isEmpty {
                    viewModel.load(visitorId: appState.visitorId)
                }
            }
            .refreshable {
                await viewModel.refresh(visitorId: appState.visitorId)
            }
            .onChange(of: appState.navigateToPlan) { planId in
                if planId != nil {
                    Task {
                        await viewModel.refresh(visitorId: appState.visitorId)
                    }
                    appState.navigateToPlan = nil
                }
            }
        }
    }
}

@MainActor
class PlansViewModel: ObservableObject {
    @Published var plans: [Plan] = []
    @Published var isLoading = false
    @Published var hasMore = false
    private var cursor: String?

    func load(visitorId: String) {
        guard !isLoading else { return }
        isLoading = true

        Task {
            do {
                let response = try await APIService.shared.listPlans(visitorId: visitorId)
                self.plans = response.items
                self.cursor = response.nextCursor
                self.hasMore = response.hasMore
            } catch {
                print("Failed to load plans: \(error)")
            }
            self.isLoading = false
        }
    }

    func loadMore(visitorId: String) {
        guard !isLoading, let cursor = cursor else { return }
        isLoading = true

        Task {
            do {
                let response = try await APIService.shared.listPlans(visitorId: visitorId, cursor: cursor)
                self.plans.append(contentsOf: response.items)
                self.cursor = response.nextCursor
                self.hasMore = response.hasMore
            } catch {
                print("Failed to load more plans: \(error)")
            }
            self.isLoading = false
        }
    }

    func refresh(visitorId: String) async {
        do {
            let response = try await APIService.shared.listPlans(visitorId: visitorId)
            self.plans = response.items
            self.cursor = response.nextCursor
            self.hasMore = response.hasMore
        } catch {
            print("Failed to refresh plans: \(error)")
        }
    }
}
```

### PlanDetailView.swift

```swift
import SwiftUI

struct PlanDetailView: View {
    let plan: Plan
    @EnvironmentObject var appState: AppState
    @State private var isLoading = true
    @State private var htmlContent: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color(hex: "1a1a2e").ignoresSafeArea()

            if let html = htmlContent {
                HtmlWebView(htmlContent: html, isLoading: $isLoading)
            } else if isLoading {
                LoadingView()
            }
        }
        .navigationTitle(plan.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        sharePlan()
                    } label: {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }

                    Button(role: .destructive) {
                        deletePlan()
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .onAppear {
            loadPlanContent()
        }
    }

    private func loadPlanContent() {
        Task {
            do {
                let fullPlan = try await APIService.shared.getPlan(
                    visitorId: appState.visitorId,
                    planId: plan.planId
                )
                self.htmlContent = fullPlan.htmlContent
            } catch {
                print("Failed to load plan: \(error)")
            }
            self.isLoading = false
        }
    }

    private func sharePlan() {
        guard let html = htmlContent else { return }
        let items: [Any] = [html]
        let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }

    private func deletePlan() {
        Task {
            try? await APIService.shared.deletePlan(
                visitorId: appState.visitorId,
                planId: plan.planId
            )
            dismiss()
        }
    }
}
```

### HistoryTab.swift

```swift
import SwiftUI

struct HistoryTab: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = HistoryViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                if viewModel.isLoading && viewModel.conversations.isEmpty {
                    LoadingView()
                } else if viewModel.conversations.isEmpty {
                    EmptyStateView(
                        icon: "clock",
                        title: "No Conversations",
                        message: "Your chat history will appear here"
                    ) {
                        appState.selectedTab = .chat
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.conversations) { conversation in
                                NavigationLink(value: conversation) {
                                    ConversationRow(conversation: conversation)
                                }
                            }

                            if viewModel.hasMore {
                                ProgressView()
                                    .onAppear {
                                        viewModel.loadMore(visitorId: appState.visitorId)
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: Conversation.self) { conversation in
                ConversationDetailView(conversation: conversation)
            }
            .onAppear {
                if viewModel.conversations.isEmpty {
                    viewModel.load(visitorId: appState.visitorId)
                }
            }
            .refreshable {
                await viewModel.refresh(visitorId: appState.visitorId)
            }
        }
    }
}

@MainActor
class HistoryViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var isLoading = false
    @Published var hasMore = false
    private var cursor: String?

    func load(visitorId: String) {
        guard !isLoading else { return }
        isLoading = true

        Task {
            do {
                let response = try await APIService.shared.listConversations(visitorId: visitorId)
                self.conversations = response.items
                self.cursor = response.nextCursor
                self.hasMore = response.hasMore
            } catch {
                print("Failed to load conversations: \(error)")
            }
            self.isLoading = false
        }
    }

    func loadMore(visitorId: String) {
        guard !isLoading, let cursor = cursor else { return }
        isLoading = true

        Task {
            do {
                let response = try await APIService.shared.listConversations(visitorId: visitorId, cursor: cursor)
                self.conversations.append(contentsOf: response.items)
                self.cursor = response.nextCursor
                self.hasMore = response.hasMore
            } catch {
                print("Failed to load more: \(error)")
            }
            self.isLoading = false
        }
    }

    func refresh(visitorId: String) async {
        do {
            let response = try await APIService.shared.listConversations(visitorId: visitorId)
            self.conversations = response.items
            self.cursor = response.nextCursor
            self.hasMore = response.hasMore
        } catch {
            print("Failed to refresh: \(error)")
        }
    }
}
```

### ConversationDetailView.swift

```swift
import SwiftUI

struct ConversationDetailView: View {
    let conversation: Conversation
    @EnvironmentObject var appState: AppState
    @State private var isLoading = true

    var body: some View {
        ZStack {
            Color(hex: "1a1a2e").ignoresSafeArea()

            WebView(
                url: Config.conversationURL(
                    visitorId: appState.visitorId,
                    conversationId: conversation.conversationId
                ),
                isLoading: $isLoading,
                onPlanSaved: nil
            )

            if isLoading {
                LoadingView()
            }
        }
        .navigationTitle(conversation.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

---

## Components

### WebView.swift

```swift
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    var onPlanSaved: ((String) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "nativeBridge")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(Color(hex: "1a1a2e"))
        webView.scrollView.backgroundColor = UIColor(Color(hex: "1a1a2e"))

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl

        webView.load(URLRequest(url: url))
        context.coordinator.webView = webView

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebView
        weak var webView: WKWebView?

        init(_ parent: WebView) {
            self.parent = parent
        }

        @objc func handleRefresh(_ refreshControl: UIRefreshControl) {
            webView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                refreshControl.endRefreshing()
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let dict = message.body as? [String: Any],
                  let action = dict["action"] as? String,
                  let payload = dict["payload"] as? [String: Any] else { return }

            switch action {
            case "planSaved":
                if let planId = payload["planId"] as? String {
                    parent.onPlanSaved?(planId)
                }
            case "haptic":
                handleHaptic(payload)
            case "share":
                handleShare(payload)
            default:
                break
            }
        }

        private func handleHaptic(_ payload: [String: Any]) {
            guard let style = payload["style"] as? String else { return }
            DispatchQueue.main.async {
                switch style {
                case "light": UIImpactFeedbackGenerator(style: .light).impactOccurred()
                case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                default: break
                }
            }
        }

        private func handleShare(_ payload: [String: Any]) {
            guard let content = payload["content"] as? String else { return }
            DispatchQueue.main.async {
                let activityVC = UIActivityViewController(activityItems: [content], applicationActivities: nil)
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let rootVC = windowScene.windows.first?.rootViewController {
                    rootVC.present(activityVC, animated: true)
                }
            }
        }
    }
}

struct HtmlWebView: UIViewRepresentable {
    let htmlContent: String
    @Binding var isLoading: Bool

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = UIColor(Color(hex: "1a1a2e"))
        webView.loadHTMLString(htmlContent, baseURL: nil)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        isLoading = false
    }
}
```

### PlanRow.swift

```swift
import SwiftUI

struct PlanRow: View {
    let plan: Plan

    var body: some View {
        HStack(spacing: 16) {
            // Map icon
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "3498db").opacity(0.2))
                    .frame(width: 56, height: 56)

                Image(systemName: "map.fill")
                    .font(.title2)
                    .foregroundColor(Color(hex: "3498db"))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(plan.title)
                    .font(.headline)
                    .foregroundColor(.white)

                HStack(spacing: 12) {
                    Label("\(plan.spotCount) spots", systemImage: "mappin")
                    Label(plan.formattedDate, systemImage: "calendar")
                }
                .font(.caption)
                .foregroundColor(.gray)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color(hex: "252542"))
        .cornerRadius(12)
    }
}
```

### ConversationRow.swift

```swift
import SwiftUI

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color(hex: "f39c12").opacity(0.2))
                    .frame(width: 48, height: 48)

                Image(systemName: "message.fill")
                    .foregroundColor(Color(hex: "f39c12"))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(conversation.title)
                    .font(.headline)
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    if let city = conversation.city {
                        Label(city, systemImage: "mappin")
                    }
                    Label("\(conversation.messageCount) messages", systemImage: "text.bubble")
                }
                .font(.caption)
                .foregroundColor(.gray)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(conversation.formattedDate)
                    .font(.caption)
                    .foregroundColor(.gray)

                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(Color(hex: "252542"))
        .cornerRadius(12)
    }
}

// Shared utility views
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text(title)
                .font(.title2)
                .fontWeight(.semibold)

            Text(message)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            Button(action: action) {
                Text("Start Planning")
                    .fontWeight(.medium)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(Color(hex: "3498db"))
                    .foregroundColor(.white)
                    .cornerRadius(25)
            }
        }
        .padding(40)
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.white)
            Text("Loading...")
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "1a1a2e"))
    }
}
```

---

## Models

### Plan.swift

```swift
import Foundation

struct Plan: Codable, Identifiable, Hashable {
    let planId: String
    let visitorId: String
    let conversationId: String
    let createdAt: Int
    let city: String
    let title: String
    var htmlContent: String?
    let spotCount: Int

    var id: String { planId }

    var formattedDate: String {
        let date = Date(timeIntervalSince1970: Double(createdAt) / 1000)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct PaginatedResponse<T: Codable>: Codable {
    let items: [T]
    let nextCursor: String?
    let hasMore: Bool
}
```

### Conversation.swift

```swift
import Foundation

struct Conversation: Codable, Identifiable, Hashable {
    let conversationId: String
    let visitorId: String
    let createdAt: Int
    let updatedAt: Int
    let title: String
    let city: String?
    let messageCount: Int

    var id: String { conversationId }

    var formattedDate: String {
        let date = Date(timeIntervalSince1970: Double(updatedAt) / 1000)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct Message: Codable {
    let id: String
    let role: String
    let content: String
    let timestamp: Int
    let isHtml: Bool?
}
```

---

## Services

### APIService.swift

```swift
import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL = Config.apiBaseURL
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    // MARK: - Plans

    func listPlans(visitorId: String, cursor: String? = nil) async throws -> PaginatedResponse<Plan> {
        var components = URLComponents(string: "\(baseURL)/api/plans")!
        components.queryItems = [URLQueryItem(name: "visitorId", value: visitorId)]
        if let cursor = cursor {
            components.queryItems?.append(URLQueryItem(name: "cursor", value: cursor))
        }

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(PaginatedResponse<Plan>.self, from: data)
    }

    func getPlan(visitorId: String, planId: String) async throws -> Plan {
        var components = URLComponents(string: "\(baseURL)/api/plans/\(planId)")!
        components.queryItems = [URLQueryItem(name: "visitorId", value: visitorId)]

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(Plan.self, from: data)
    }

    func deletePlan(visitorId: String, planId: String) async throws {
        var components = URLComponents(string: "\(baseURL)/api/plans/\(planId)")!
        components.queryItems = [URLQueryItem(name: "visitorId", value: visitorId)]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "DELETE"

        _ = try await URLSession.shared.data(for: request)
    }

    // MARK: - Conversations

    func listConversations(visitorId: String, cursor: String? = nil) async throws -> PaginatedResponse<Conversation> {
        var components = URLComponents(string: "\(baseURL)/api/conversations")!
        components.queryItems = [URLQueryItem(name: "visitorId", value: visitorId)]
        if let cursor = cursor {
            components.queryItems?.append(URLQueryItem(name: "cursor", value: cursor))
        }

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(PaginatedResponse<Conversation>.self, from: data)
    }

    func getConversation(visitorId: String, conversationId: String) async throws -> ConversationDetail {
        var components = URLComponents(string: "\(baseURL)/api/conversations/\(conversationId)")!
        components.queryItems = [URLQueryItem(name: "visitorId", value: visitorId)]

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        return try decoder.decode(ConversationDetail.self, from: data)
    }
}

struct ConversationDetail: Codable {
    let conversation: Conversation
    let messages: [Message]
}
```

---

## Setup Checklist

1. ✅ Create new Xcode project (iOS App, SwiftUI)
2. ✅ Add all Swift files listed above
3. ✅ Update `Config.swift` with your CloudFront URL
4. ✅ Update `Info.plist` with required keys
5. ✅ Configure signing & capabilities
6. ✅ Build and test in simulator
7. ✅ Archive and upload to TestFlight

## Notes

- All colors use hex codes matching the web app (#1a1a2e, #3498db, #f39c12, #252542)
- WebView handles communication with React app via JavaScript bridge
- Pull-to-refresh is built into all list views
- Haptic feedback triggers on user interactions
- Share functionality uses native iOS share sheet

For questions or issues, refer to the main [README.md](../README.md)
