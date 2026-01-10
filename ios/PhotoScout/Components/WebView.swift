//
//  WebView.swift
//  PhotoScout
//
//  WKWebView wrapper for SwiftUI
//

import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    var onURLChange: ((URL) -> Void)? = nil

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.navigationDelegate = context.coordinator

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Only load if URL changed - prevents reloading on every SwiftUI update
        if webView.url != url {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebView

        init(_ parent: WebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url {
                parent.onURLChange?(url)
            }
            decisionHandler(.allow)
        }
    }
}

// UIViewController wrapper for WKWebView - better touch handling
class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var webView: WKWebView!
    var url: URL
    var userId: String = ""
    var userName: String = ""
    var userEmail: String = ""
    var userPhoto: String = ""
    private var hasLoaded = false

    init(url: URL) {
        self.url = url
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true

        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences = preferences
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        // Enable data detection for links
        configuration.dataDetectorTypes = []

        // Process pool for better JS execution
        configuration.processPool = WKProcessPool()

        // Add message handler for native bridge
        configuration.userContentController.add(self, name: "nativeBridge")

        // Add script to capture console.log messages
        let consoleScript = WKUserScript(
            source: """
            (function() {
                var originalLog = console.log;
                var originalError = console.error;
                var originalWarn = console.warn;
                console.log = function() {
                    originalLog.apply(console, arguments);
                    window.webkit.messageHandlers.nativeBridge.postMessage({
                        action: 'console',
                        payload: { level: 'log', message: Array.from(arguments).map(String).join(' ') }
                    });
                };
                console.error = function() {
                    originalError.apply(console, arguments);
                    window.webkit.messageHandlers.nativeBridge.postMessage({
                        action: 'console',
                        payload: { level: 'error', message: Array.from(arguments).map(String).join(' ') }
                    });
                };
                console.warn = function() {
                    originalWarn.apply(console, arguments);
                    window.webkit.messageHandlers.nativeBridge.postMessage({
                        action: 'console',
                        payload: { level: 'warn', message: Array.from(arguments).map(String).join(' ') }
                    });
                };
                window.onerror = function(msg, url, line, col, error) {
                    window.webkit.messageHandlers.nativeBridge.postMessage({
                        action: 'console',
                        payload: { level: 'error', message: 'JS Error: ' + msg + ' at ' + url + ':' + line }
                    });
                };
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        configuration.userContentController.addUserScript(consoleScript)

        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true

        // Scroll view settings - important for proper touch handling
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = true
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.delaysContentTouches = false
        webView.scrollView.canCancelContentTouches = true

        // Ensure touch events pass through properly
        webView.isMultipleTouchEnabled = true
        webView.scrollView.isMultipleTouchEnabled = true
        for subview in webView.scrollView.subviews {
            subview.isUserInteractionEnabled = true
            if let gestureRecognizers = subview.gestureRecognizers {
                for gesture in gestureRecognizers {
                    gesture.isEnabled = true
                }
            }
        }

        // Background
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.039, green: 0.039, blue: 0.059, alpha: 1.0) // #0a0a0f
        webView.scrollView.backgroundColor = UIColor(red: 0.039, green: 0.039, blue: 0.059, alpha: 1.0)

        view.addSubview(webView)

        // Load the URL only once
        if !hasLoaded {
            hasLoaded = true
            print("[WebView] Loading URL: \(url.absoluteString)")
            print("[WebView] User ID: \(userId)")
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView.frame = view.bounds
    }
    
    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "nativeBridge")
    }
    
    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        print("[WebView] Started loading: \(webView.url?.absoluteString ?? "unknown")")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[WebView] Finished loading: \(webView.url?.absoluteString ?? "unknown")")
        injectNativeAuth()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("[WebView] Navigation failed: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("[WebView] Provisional navigation failed: \(error.localizedDescription)")
    }
    
    private func injectNativeAuth() {
        let script = """
        (function() {
            window.nativeAuth = {
                userId: "\(userId)",
                userName: "\(userName)",
                userEmail: "\(userEmail)",
                userPhoto: "\(userPhoto)"
            };
            window.dispatchEvent(new CustomEvent('nativeAuthReady', { detail: window.nativeAuth }));
            console.log('Native auth injected:', window.nativeAuth);
        })();
        """
        
        webView.evaluateJavaScript(script) { _, error in
            if let error = error {
                print("Error injecting native auth: \(error)")
            }
        }
    }
    
    // MARK: - WKUIDelegate
    
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler()
        })
        present(alert, animated: true)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
            completionHandler(false)
        })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler(true)
        })
        present(alert, animated: true)
    }
    
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }
    
    // MARK: - WKScriptMessageHandler
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }
        
        switch action {
        case "haptic":
            if let payload = body["payload"] as? [String: Any],
               let style = payload["style"] as? String {
                let generator: UIImpactFeedbackGenerator
                switch style {
                case "light":
                    generator = UIImpactFeedbackGenerator(style: .light)
                case "heavy":
                    generator = UIImpactFeedbackGenerator(style: .heavy)
                default:
                    generator = UIImpactFeedbackGenerator(style: .medium)
                }
                generator.impactOccurred()
            }
        case "share":
            if let payload = body["payload"] as? [String: Any],
               let content = payload["content"] as? String {
                let activityVC = UIActivityViewController(activityItems: [content], applicationActivities: nil)
                present(activityVC, animated: true)
            }
        case "copyToClipboard":
            if let payload = body["payload"] as? [String: Any],
               let text = payload["text"] as? String {
                UIPasteboard.general.string = text
            }
        case "console":
            if let payload = body["payload"] as? [String: Any],
               let level = payload["level"] as? String,
               let message = payload["message"] as? String {
                print("[WebView \(level.uppercased())] \(message)")
            }
        default:
            break
        }
    }
}

// SwiftUI wrapper for WebViewController
struct AuthenticatedWebView: UIViewControllerRepresentable {
    let url: URL
    private let authService = AuthenticationService.shared

    func makeUIViewController(context: Context) -> WebViewController {
        let controller = WebViewController(url: url)
        controller.userId = authService.userId ?? ""
        controller.userName = authService.userName ?? ""
        controller.userEmail = authService.userEmail ?? ""
        controller.userPhoto = authService.userPhotoURL ?? ""
        return controller
    }

    func updateUIViewController(_ uiViewController: WebViewController, context: Context) {
        // Don't update anything - prevents SwiftUI from causing issues
        // Auth is already injected on page load
    }
}
