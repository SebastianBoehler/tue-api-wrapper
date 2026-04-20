import SwiftUI

struct MailUniversityApprovalBadge: View {
    var notice: MailUniversityApprovalNotice
    var showsMessage = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(notice.title, systemImage: "checkmark.seal.fill")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.green)
            if showsMessage {
                Text(notice.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
