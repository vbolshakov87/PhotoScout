//
//  AuthenticationService.swift
//  PhotoScout
//
//  Service for handling Google Sign-In authentication
//

import Foundation
import Combine
import AuthenticationServices

@MainActor
class AuthenticationService: ObservableObject {
    static let shared = AuthenticationService()

    @Published var isAuthenticated = false
    @Published var userEmail: String?
    @Published var userId: String?
    @Published var userName: String?
    @Published var userPhotoURL: String?

    private let clientId = "216349065006-1h82se9fvqkjai37363bupgkasb6q8ug.apps.googleusercontent.com"

    private init() {
        // Check if user is already authenticated
        if let storedUserId = UserDefaults.standard.string(forKey: "userId"),
           let storedEmail = UserDefaults.standard.string(forKey: "userEmail") {
            self.userId = storedUserId
            self.userEmail = storedEmail
            self.userName = UserDefaults.standard.string(forKey: "userName")
            self.userPhotoURL = UserDefaults.standard.string(forKey: "userPhotoURL")
            self.isAuthenticated = true
        }
    }

    // Visitor ID for API calls (uses Google user ID when available)
    var visitorId: String {
        if let userId = userId {
            return userId
        }
        // Fallback to device-specific ID if not authenticated
        if let stored = UserDefaults.standard.string(forKey: "deviceVisitorId") {
            return stored
        }
        let new = UUID().uuidString
        UserDefaults.standard.set(new, forKey: "deviceVisitorId")
        return new
    }

    func signInWithGoogle(idToken: String) async throws {
        // Verify the ID token with your backend or decode it locally
        // For now, we'll decode the JWT token to get user info
        let payload = try decodeJWT(idToken: idToken)

        guard let sub = payload["sub"] as? String,
              let email = payload["email"] as? String else {
            throw AuthError.invalidToken
        }

        // Store user information
        self.userId = sub
        self.userEmail = email
        self.userName = payload["name"] as? String
        self.userPhotoURL = payload["picture"] as? String
        self.isAuthenticated = true

        // Persist to UserDefaults
        UserDefaults.standard.set(sub, forKey: "userId")
        UserDefaults.standard.set(email, forKey: "userEmail")
        if let name = self.userName {
            UserDefaults.standard.set(name, forKey: "userName")
        }
        if let photo = self.userPhotoURL {
            UserDefaults.standard.set(photo, forKey: "userPhotoURL")
        }
    }

    func signOut() {
        self.isAuthenticated = false
        self.userId = nil
        self.userEmail = nil
        self.userName = nil
        self.userPhotoURL = nil

        // Clear stored data
        UserDefaults.standard.removeObject(forKey: "userId")
        UserDefaults.standard.removeObject(forKey: "userEmail")
        UserDefaults.standard.removeObject(forKey: "userName")
        UserDefaults.standard.removeObject(forKey: "userPhotoURL")
    }

    private func decodeJWT(idToken: String) throws -> [String: Any] {
        let segments = idToken.components(separatedBy: ".")
        guard segments.count > 1 else {
            throw AuthError.invalidToken
        }

        let payloadSegment = segments[1]
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AuthError.invalidToken
        }

        return json
    }
}

enum AuthError: LocalizedError {
    case invalidToken
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .invalidToken:
            return "Invalid authentication token"
        case .notAuthenticated:
            return "User is not authenticated"
        }
    }
}
