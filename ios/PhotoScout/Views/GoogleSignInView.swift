//
//  GoogleSignInView.swift
//  PhotoScout
//
//  Native Google Sign-In view using ASWebAuthenticationSession
//

import SwiftUI
import AuthenticationServices
import Combine

struct GoogleSignInView: View {
    @ObservedObject private var authService = AuthenticationService.shared
    @State private var isAuthenticating = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var currentImageIndex = 0
    @Environment(\.colorScheme) var colorScheme

    private let clientId = "216349065006-1h82se9fvqkjai37363bupgkasb6q8ug.apps.googleusercontent.com"
    private let redirectScheme = "com.googleusercontent.apps.216349065006-1h82se9fvqkjai37363bupgkasb6q8ug"

    // Portfolio photos from vbolshakov.photo
    private let portfolioImages = [
        "https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_856,f_webp,q_90,t_r/germany/DSC_4697-Edit.jpg",
        "https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/norway/_DSC5882-Pano-Edit.jpg",
        "https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/japan/DSC_6100.jpg",
        "https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_869,f_webp,q_90,t_r/norway/_DSC6030-Edit.jpg",
        "https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/germany/DSC_4744-Edit.jpg",
    ]

    private let imageTimer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // Background photo carousel
            TabView(selection: $currentImageIndex) {
                ForEach(0..<portfolioImages.count, id: \.self) { index in
                    AsyncImage(url: URL(string: portfolioImages[index])) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure(_):
                            Color.black
                        case .empty:
                            Color.black
                        @unknown default:
                            Color.black
                        }
                    }
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()
            .onReceive(imageTimer) { _ in
                withAnimation(.easeInOut(duration: 1)) {
                    currentImageIndex = (currentImageIndex + 1) % portfolioImages.count
                }
            }

            // Dark gradient overlay - transparent in middle to show photos
            LinearGradient(
                colors: [
                    Color.black.opacity(0.4),
                    Color.black.opacity(0.1),
                    Color.black.opacity(0.9)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Content - Logo at top, form at bottom
            VStack(spacing: 0) {
                // Top section - Logo & Tagline
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        // App icon
                        AsyncImage(url: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/city-images/appicon.png")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.blue)
                                .overlay(
                                    Image(systemName: "camera.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(.white)
                                )
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.3), radius: 10, y: 5)

                        Text("PhotoScout")
                            .font(.system(size: 28, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                    }

                    Text("Plan your perfect photo trip")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.top, 60)

                // Middle spacer - shows the photos
                Spacer()

                // Bottom section - Sign in form
                VStack(spacing: 16) {
                    // Sign in card
                    VStack(spacing: 12) {
                        Button(action: {
                            startGoogleSignIn()
                        }) {
                            HStack(spacing: 12) {
                                if isAuthenticating {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                } else {
                                    Text("G")
                                        .font(.system(size: 18, weight: .bold, design: .rounded))
                                        .foregroundColor(.blue)
                                }

                                Text(isAuthenticating ? "Signing in..." : "Sign in with Google")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.black)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.white)
                            )
                        }
                        .disabled(isAuthenticating)

                        // Divider
                        HStack {
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 1)
                            Text("or")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 1)
                        }

                        // Continue as guest button
                        Button(action: {
                            authService.signInAsGuest()
                        }) {
                            Text("Continue as guest")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                )
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.white.opacity(0.1))
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                    )

                    // Terms and Privacy links
                    VStack(spacing: 4) {
                        Text("By signing in, you agree to our")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))

                        HStack(spacing: 4) {
                            Link("Terms", destination: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/terms")!)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.9))

                            Text("and")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))

                            Link("Privacy Policy", destination: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/privacy")!)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }

                    // Photo credit
                    Text("Photos by Vladimir Bolshakov")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
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
