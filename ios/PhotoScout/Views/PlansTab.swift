//
//  PlansTab.swift
//  PhotoScout
//
//  View for browsing saved photo trip plans
//

import SwiftUI

struct PlansTab: View {
    @ObservedObject private var authService = AuthenticationService.shared
    @State private var plans: [Plan] = []
    @State private var selectedPlan: Plan?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading plans...")
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)

                        Text("Error Loading Plans")
                            .font(.headline)

                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button("Try Again") {
                            Task {
                                await loadPlans()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else if authService.isGuest && plans.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)

                        Text("Sign in to Save Trips")
                            .font(.headline)

                        Text("Your trips will be saved when you sign in with Google")
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
                } else if plans.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "map")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)

                        Text("No Plans Yet")
                            .font(.headline)

                        Text("Create a photo trip plan in the Chat tab")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12)
                        ], spacing: 12) {
                            ForEach(plans) { plan in
                                Button {
                                    selectedPlan = plan
                                } label: {
                                    PlanRow(plan: plan)
                                }
                                .buttonStyle(PlainButtonStyle())
                                .contextMenu {
                                    Button(role: .destructive) {
                                        deletePlan(plan)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadPlans()
                    }
                }
            }
            .navigationTitle("My Trips")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await loadPlans() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .fullScreenCover(item: $selectedPlan) { plan in
                PlanDetailView(plan: plan)
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
        .task {
            await loadPlans()
        }
    }

    private func loadPlans() async {
        isLoading = true
        errorMessage = nil

        do {
            plans = try await APIService.shared.fetchPlans()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func deletePlan(_ plan: Plan) {
        Task {
            do {
                try await APIService.shared.deletePlan(id: plan.id)
                await loadPlans()
            } catch {
                errorMessage = "Failed to delete plan: \(error.localizedDescription)"
            }
        }
    }

    private func deletePlans(at offsets: IndexSet) {
        for index in offsets {
            deletePlan(plans[index])
        }
    }
}

#Preview {
    PlansTab()
}
