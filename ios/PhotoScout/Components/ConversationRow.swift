//
//  ConversationRow.swift
//  PhotoScout
//
//  Row component for displaying a conversation in a list
//

import SwiftUI

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(conversation.title)
                .font(.headline)
                .lineLimit(2)

            HStack {
                if let city = conversation.city {
                    Label(city, systemImage: "location.fill")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }

                Spacer()

                Label("\(conversation.messageCount) messages", systemImage: "message.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(conversation.formattedUpdatedDate)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    List {
        ConversationRow(conversation: Conversation(
            id: "1",
            title: "Photo trip to Hamburg",
            city: "Hamburg",
            messageCount: 5,
            createdAt: Date().timeIntervalSince1970 * 1000 - 3600000,
            updatedAt: Date().timeIntervalSince1970 * 1000
        ))

        ConversationRow(conversation: Conversation(
            id: "2",
            title: "Vienna photography spots",
            city: "Vienna",
            messageCount: 12,
            createdAt: Date().timeIntervalSince1970 * 1000 - 86400000,
            updatedAt: Date().timeIntervalSince1970 * 1000 - 7200000
        ))
    }
}
