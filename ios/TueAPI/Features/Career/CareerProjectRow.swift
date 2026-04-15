import SwiftUI

struct CareerProjectRow: View {
    var project: CareerProjectSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            tags

            Text(project.title)
                .font(.headline)
                .lineLimit(3)

            if !project.organizations.isEmpty {
                Text(project.organizations.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            if let preview = project.preview?.trimmedOrNil {
                Text(preview)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            dateLine
        }
        .padding(.vertical, 4)
    }

    private var tags: some View {
        HStack(spacing: 8) {
            ForEach(project.projectTypes.prefix(2), id: \.self) { type in
                Label(type, systemImage: "briefcase")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let location = project.location?.trimmedOrNil {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var dateLine: some View {
        let start = CareerDateFormatter.displayText(project.startDate)
        let created = CareerDateFormatter.displayText(project.createdAt)
        if start != nil || created != nil {
            HStack(spacing: 10) {
                if let start {
                    Label("Start \(start)", systemImage: "calendar")
                }
                if let created {
                    Label("Listed \(created)", systemImage: "clock")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }
}
