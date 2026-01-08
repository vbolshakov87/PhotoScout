//
//  PhotoScoutApp.swift
//  PhotoScout
//
//  Main app entry point
//

import SwiftUI

@main
struct PhotoScoutApp: App {
    @ObservedObject private var authService = AuthenticationService.shared

    var body: some Scene {
        WindowGroup {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                GoogleSignInView()
            }
        }
    }
}
