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
        VStack(alignment: .leading, spacing: 0) {
            // Thumbnail placeholder
            ZStack {
                Rectangle()
                    .fill(Color(red: 0.15, green: 0.15, blue: 0.25))
                    .aspectRatio(4/3, contentMode: .fill)

                Image(systemName: "paperplane")
                    .font(.system(size: 30))
                    .foregroundColor(.blue.opacity(0.4))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(plan.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 4) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 10))
                    Text(plan.city)
                        .font(.caption2)
                }
                .foregroundColor(.secondary)

                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 10))
                    Text(plan.formattedDate)
                        .font(.caption2)
                }
                .foregroundColor(.secondary)

                if plan.spotCount > 0 {
                    Text("\(plan.spotCount) spots")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                        .padding(.top, 2)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(UIColor.secondarySystemBackground))
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.primary.opacity(0.1), lineWidth: 1)
        )
    }
}

#Preview {
    List {
        PlanRow(plan: Plan(
            id: "1",
            city: "Hamburg",
            title: "Hamburg Photo Trip",
            dates: nil,
            spotCount: 8,
            createdAt: Date().timeIntervalSince1970 * 1000,
            htmlUrl: nil,
            htmlContent: nil
        ))
    }
}
