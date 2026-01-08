//
//  APIService.swift
//  PhotoScout
//
//  Service for making API calls
//

import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL = Config.apiBaseURL
    private var visitorId: String {
        return AuthenticationService.shared.visitorId
    }

    // MARK: - Plans

    func fetchPlans() async throws -> [Plan] {
        guard let url = URL(string: "\(baseURL)/plans?visitorId=\(visitorId)&limit=50") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(PlansResponse.self, from: data)
        return response.items
    }

    func fetchPlan(id: String) async throws -> Plan {
        guard let url = URL(string: "\(baseURL)/plans/\(id)?visitorId=\(visitorId)") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(Plan.self, from: data)
    }

    func deletePlan(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/plans/\(id)?visitorId=\(visitorId)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    // MARK: - Conversations

    func fetchConversations() async throws -> [Conversation] {
        guard let url = URL(string: "\(baseURL)/conversations?visitorId=\(visitorId)&limit=50") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(ConversationsResponse.self, from: data)
        return response.items
    }

    func fetchConversation(id: String) async throws -> ConversationDetail {
        guard let url = URL(string: "\(baseURL)/conversations/\(id)?visitorId=\(visitorId)") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ConversationDetail.self, from: data)
    }
}
