//
//  PlansTab.swift
//  PhotoScout
//
//  View for browsing saved photo trip plans
//

import SwiftUI

struct PlansTab: View {
    @State private var plans: [Plan] = []
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
                    List {
                        ForEach(plans) { plan in
                            NavigationLink(destination: PlanDetailView(plan: plan)) {
                                PlanRow(plan: plan)
                            }
                        }
                        .onDelete(perform: deletePlans)
                    }
                    .refreshable {
                        await loadPlans()
                    }
                }
            }
            .navigationTitle("Saved Plans")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await loadPlans() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
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

    private func deletePlans(at offsets: IndexSet) {
        for index in offsets {
            let plan = plans[index]
            Task {
                do {
                    try await APIService.shared.deletePlan(id: plan.id)
                    await loadPlans()
                } catch {
                    errorMessage = "Failed to delete plan: \(error.localizedDescription)"
                }
            }
        }
    }
}

#Preview {
    PlansTab()
}
