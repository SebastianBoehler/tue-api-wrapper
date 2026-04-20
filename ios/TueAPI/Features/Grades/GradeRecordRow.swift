import SwiftUI

struct GradeRecordRow: View {
    var exam: AlmaExamRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(exam.title)
                        .font(.headline)
                        .lineLimit(2)
                    Text(metadataText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Spacer(minLength: 8)

                VStack(alignment: .trailing, spacing: 6) {
                    if let grade = exam.grade?.trimmedOrNil {
                        badge(grade, tint: gradeTint)
                    }
                    if let status = exam.status?.trimmedOrNil {
                        badge(status, tint: statusTint)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var metadataText: String {
        [
            exam.number?.trimmedOrNil,
            exam.cp?.trimmedOrNil.map { "\($0) CP" },
            exam.attempt?.trimmedOrNil.map { "Attempt \($0)" },
            exam.kind?.trimmedOrNil
        ]
            .compactMap { $0 }
            .joined(separator: " · ")
            .trimmedOrNil ?? "No structured metadata"
    }

    private var gradeTint: Color {
        exam.grade?.trimmedOrNil == "5,0" ? .red : .green
    }

    private var statusTint: Color {
        GradeOverviewStats.isPassed(exam) ? .green : .secondary
    }

    private func badge(_ text: String, tint: Color) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(tint)
            .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}
