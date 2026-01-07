//
//  PlanRow.swift
//  PhotoScout
//
//  Row component for displaying a plan in a list
//

import SwiftUI

struct PlanRow: View {
    let plan: Plan

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(plan.title)
                .font(.headline)

            HStack {
                Label("\(plan.city)", systemImage: "location.fill")
                    .font(.subheadline)
                    .foregroundColor(.blue)

                Spacer()

                Label("\(plan.spotCount) spots", systemImage: "camera.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(plan.formattedDate)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    List {
        PlanRow(plan: Plan(
            id: "1",
            city: "Hamburg",
            title: "Hamburg Photo Trip",
            spotCount: 8,
            createdAt: Date().timeIntervalSince1970 * 1000,
            htmlContent: nil
        ))
    }
}
