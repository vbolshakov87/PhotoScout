//
//  SettingsTab.swift
//  PhotoScout
//
//  Settings and account management
//

import SwiftUI

struct SettingsTab: View {
    @ObservedObject private var authService = AuthenticationService.shared
    @State private var showingSignOutAlert = false

    var body: some View {
        NavigationView {
            List {
                // Account section
                Section {
                    if authService.isAuthenticated {
                        HStack(spacing: 12) {
                            // Profile avatar
                            AsyncImage(url: URL(string: authService.userPhotoURL ?? "")) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                case .failure(_), .empty:
                                    Image(systemName: "person.circle.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray)
                                @unknown default:
                                    Image(systemName: "person.circle.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray)
                                }
                            }
                            .frame(width: 50, height: 50)
                            .clipShape(Circle())

                            VStack(alignment: .leading, spacing: 4) {
                                Text(authService.userName ?? "User")
                                    .font(.headline)
                                Text(authService.userEmail ?? "")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Account")
                }

                // About section
                Section {
                    Link(destination: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/about")!) {
                        HStack {
                            Label("About PhotoScout", systemImage: "info.circle")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)

                    Link(destination: URL(string: "https://vbolshakov.photo")!) {
                        HStack {
                            Label("Photography Portfolio", systemImage: "camera")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)
                } header: {
                    Text("About")
                }

                // Legal section
                Section {
                    Link(destination: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/terms")!) {
                        HStack {
                            Label("Terms of Service", systemImage: "doc.text")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)

                    Link(destination: URL(string: "https://d2mpt2trz11kx7.cloudfront.net/privacy")!) {
                        HStack {
                            Label("Privacy Policy", systemImage: "hand.raised")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)
                } header: {
                    Text("Legal")
                }

                // Sign out section
                Section {
                    Button(action: {
                        showingSignOutAlert = true
                    }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }

                // App info
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Build")
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("App Info")
                }
            }
            .navigationTitle("Settings")
            .alert("Sign Out", isPresented: $showingSignOutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    authService.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

#Preview {
    SettingsTab()
}
