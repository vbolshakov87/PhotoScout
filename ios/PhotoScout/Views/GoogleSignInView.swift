//
//  GoogleSignInView.swift
//  PhotoScout
//
//  Native Google Sign-In view using ASWebAuthenticationSession
//

import SwiftUI
import AuthenticationServices

struct GoogleSignInView: View {
    @ObservedObject private var authService = AuthenticationService.shared
    @State private var isAuthenticating = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @Environment(\.colorScheme) var colorScheme

    private let clientId = "216349065006-1h82se9fvqkjai37363bupgkasb6q8ug.apps.googleusercontent.com"
    private let redirectScheme = "com.googleusercontent.apps.216349065006-1h82se9fvqkjai37363bupgkasb6q8ug"

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // App icon/logo area
            VStack(spacing: 16) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("PhotoScout Alpha")
                    .font(.system(size: 36, weight: .bold, design: .rounded))

                Text("Plan your perfect photo trip in 1 minute")
                    .font(.headline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Spacer()

            // Sign in button
            VStack(spacing: 16) {
                Button(action: {
                    startGoogleSignIn()
                }) {
                    HStack(spacing: 12) {
                        if isAuthenticating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "person.circle.fill")
                                .font(.title3)
                        }

                        Text(isAuthenticating ? "Signing in..." : "Sign in with Google")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isAuthenticating)
                .padding(.horizontal, 32)

                Text("Securely sign in using your Google account")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()
                .frame(height: 60)
        }
        .alert("Authentication Error", isPresented: $showingError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }

    private func startGoogleSignIn() {
        isAuthenticating = true

        let redirectURI = "\(redirectScheme):/oauth2redirect"
        let scope = "openid profile email".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "openid%20profile%20email"
        
        let authURLString = "https://accounts.google.com/o/oauth2/v2/auth?client_id=\(clientId)&redirect_uri=\(redirectURI)&response_type=code&scope=\(scope)&access_type=offline"
        
        guard let authURL = URL(string: authURLString) else {
            errorMessage = "Invalid authentication URL"
            showingError = true
            isAuthenticating = false
            return
        }

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: redirectScheme
        ) { callbackURL, error in
            isAuthenticating = false
            
            if let error = error {
                if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                    // User cancelled, don't show error
                    return
                }
                errorMessage = error.localizedDescription
                showingError = true
                return
            }
            
            guard let callbackURL = callbackURL,
                  let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                errorMessage = "No authorization code received"
                showingError = true
                return
            }
            
            // Exchange the code for tokens
            Task {
                do {
                    try await exchangeCodeForToken(code: code)
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                        showingError = true
                    }
                }
            }
        }
        
        session.presentationContextProvider = WebAuthPresentationContextProvider.shared
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }
    
    private func exchangeCodeForToken(code: String) async throws {
        let redirectURI = "\(redirectScheme):/oauth2redirect"
        
        let tokenURL = URL(string: "https://oauth2.googleapis.com/token")!
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let body = "code=\(code)&client_id=\(clientId)&redirect_uri=\(redirectURI)&grant_type=authorization_code"
        request.httpBody = body.data(using: .utf8)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw AuthError.invalidToken
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let idToken = json["id_token"] as? String else {
            throw AuthError.invalidToken
        }
        
        // Use the ID token to sign in
        try await authService.signInWithGoogle(idToken: idToken)
    }
}

// Presentation context provider for ASWebAuthenticationSession
class WebAuthPresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthPresentationContextProvider()
    
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}

#Preview {
    GoogleSignInView()
}
