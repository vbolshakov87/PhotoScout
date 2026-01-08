//
//  Plan.swift
//  PhotoScout
//
//  Model for photo trip plans
//

import Foundation

struct Plan: Identifiable, Codable {
    let id: String
    let city: String
    let title: String
    let dates: String?
    let spotCount: Int
    let createdAt: Double
    let htmlUrl: String?
    let htmlContent: String?

    enum CodingKeys: String, CodingKey {
        case id = "planId"
        case city
        case title
        case dates
        case spotCount
        case createdAt
        case htmlUrl
        case htmlContent
    }

    var createdDate: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }

    var formattedDate: String {
        if let dates = dates {
            return dates
        }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: createdDate)
    }
}

struct PlansResponse: Codable {
    let items: [Plan]
    let nextCursor: String?
    let hasMore: Bool
}
