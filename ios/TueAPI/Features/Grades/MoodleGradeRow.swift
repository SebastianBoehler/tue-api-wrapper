import SwiftUI

struct MoodleGradeRow: View {
    var grade: MoodleGradeItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(grade.courseTitle)
                .font(.headline)
                .lineLimit(2)

            HStack(spacing: 6) {
                if let value = grade.grade?.trimmedOrNil {
                    badge(value, systemImage: "graduationcap")
                }
                if let percentage = grade.percentage?.trimmedOrNil {
                    badge(percentage, systemImage: "percent")
                }
                if let range = grade.rangeHint?.trimmedOrNil {
                    badge(range, systemImage: "ruler")
                }
            }

            if let feedback = grade.feedback?.trimmedOrNil {
                Text(feedback)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }

    private func badge(_ text: String, systemImage: String) -> some View {
        Label(text, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}
