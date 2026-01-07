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
    let spotCount: Int
    let createdAt: Double
    let htmlContent: String?

    enum CodingKeys: String, CodingKey {
        case id = "planId"
        case city
        case title
        case spotCount
        case createdAt
        case htmlContent
    }

    var createdDate: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdDate)
    }
}

struct PlansResponse: Codable {
    let plans: [Plan]
    let cursor: String?
}
