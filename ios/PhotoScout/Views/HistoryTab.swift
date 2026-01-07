//
//  HistoryTab.swift
//  PhotoScout
//
//  View for browsing conversation history
//

import SwiftUI

struct HistoryTab: View {
    @State private var conversations: [Conversation] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

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
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await loadConversations() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
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
