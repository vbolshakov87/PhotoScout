//
//  ConversationDetailView.swift
//  PhotoScout
//
//  Detail view for displaying conversation messages
//

import SwiftUI

struct ConversationDetailView: View {
    let conversation: Conversation
    @State private var detail: ConversationDetail?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading conversation...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)

                    Text("Error Loading Conversation")
                        .font(.headline)

                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Button("Try Again") {
                        Task {
                            await loadConversation()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else if let messages = detail?.messages {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        ForEach(messages) { message in
                            MessageBubble(message: message)
                        }
                    }
                    .padding()
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "message")
                        .font(.system(size: 50))
                        .foregroundColor(.gray)

                    Text("No messages")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle(conversation.city ?? "Conversation")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadConversation()
        }
    }

    private func loadConversation() async {
        isLoading = true
        errorMessage = nil

        do {
            detail = try await APIService.shared.fetchConversation(id: conversation.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// Message bubble component
struct MessageBubble: View {
    let message: Message

    var isUser: Bool {
        message.role == "user"
    }

    var body: some View {
        HStack {
            if isUser { Spacer() }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                if message.isHtml == true {
                    Text("HTML Plan")
                        .font(.caption)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                } else {
                    Text(message.content)
                        .font(.body)
                        .foregroundColor(isUser ? .white : .primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(isUser ? Color.blue : Color.gray.opacity(0.2))
                        .cornerRadius(16)
                }

                Text(message.formattedTime)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !isUser { Spacer() }
        }
    }
}

#Preview {
    NavigationView {
        ConversationDetailView(conversation: Conversation(
            id: "1",
            title: "Photo trip to Hamburg",
            city: "Hamburg",
            messageCount: 5,
            createdAt: Date().timeIntervalSince1970 * 1000,
            updatedAt: Date().timeIntervalSince1970 * 1000
        ))
    }
}
