//
//  Conversation.swift
//  PhotoScout
//
//  Model for conversation history
//

import Foundation

struct Conversation: Identifiable, Codable {
    let id: String
    let title: String
    let city: String?
    let messageCount: Int
    let createdAt: Double
    let updatedAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "conversationId"
        case title
        case city
        case messageCount
        case createdAt
        case updatedAt
    }

    var createdDate: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }

    var updatedDate: Date {
        Date(timeIntervalSince1970: updatedAt / 1000)
    }

    var formattedUpdatedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: updatedDate, relativeTo: Date())
    }
}

struct Message: Identifiable, Codable {
    let id: String
    let role: String
    let content: String
    let timestamp: Double
    let isHtml: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "messageId"
        case role
        case content
        case timestamp
        case isHtml
    }

    var date: Date {
        Date(timeIntervalSince1970: timestamp / 1000)
    }

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct ConversationDetail: Codable {
    let conversation: Conversation
    let messages: [Message]
}

struct ConversationsResponse: Codable {
    let conversations: [Conversation]
    let cursor: String?
}
