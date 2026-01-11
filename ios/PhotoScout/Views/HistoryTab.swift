//
//  HistoryTab.swift
//  PhotoScout
//
//  View for browsing conversation history
//

import SwiftUI

struct HistoryTab: View {
    @ObservedObject private var authService = AuthenticationService.shared
    @State private var conversations: [Conversation] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingSignOutAlert = false

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading conversations...")
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)

                        Text("Error Loading History")
                            .font(.headline)

                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button("Try Again") {
                            Task {
                                await loadConversations()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else if authService.isGuest && conversations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)

                        Text("Sign in to Save History")
                            .font(.headline)

                        Text("Your chat history will be saved when you sign in with Google")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button(action: {
                            authService.signOut()
                        }) {
                            HStack {
                                Text("G")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.blue)
                                Text("Sign in with Google")
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color(.systemBackground))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding()
                } else if conversations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "clock")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)

                        Text("No Conversations Yet")
                            .font(.headline)

                        Text("Your chat history will appear here")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(conversations) { conversation in
                            NavigationLink(destination: ConversationDetailView(conversation: conversation)) {
                                ConversationRow(conversation: conversation)
                            }
                        }
                    }
                    .refreshable {
                        await loadConversations()
                    }
                }
            }
            .navigationTitle("History")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Menu {
                        Text(authService.isGuest ? "Guest" : (authService.userName ?? "User"))
                        if !authService.isGuest, let userEmail = authService.userEmail {
                            Text(userEmail)
                                .font(.caption)
                        }
                        Divider()
                        if authService.isGuest {
                            Button(action: {
                                authService.signOut()
                            }) {
                                Label("Sign in with Google", systemImage: "person.badge.plus")
                            }
                        } else {
                            Button(role: .destructive, action: {
                                showingSignOutAlert = true
                            }) {
                                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            }
                        }
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .font(.title3)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await loadConversations() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .alert("Sign Out", isPresented: $showingSignOutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    authService.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
        .task {
            await loadConversations()
        }
    }

    private func loadConversations() async {
        isLoading = true
        errorMessage = nil

        do {
            conversations = try await APIService.shared.fetchConversations()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    HistoryTab()
}
