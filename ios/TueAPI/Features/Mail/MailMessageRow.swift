import SwiftUI

struct MailMessageRow: View {
    var message: MailMessageSummary

    var body: some View {
        AppSurfaceCard {
            HStack(alignment: .top, spacing: 12) {
                Circle()
                    .fill(message.isUnread ? Color.accentColor : Color.secondary.opacity(0.18))
                    .frame(width: 10, height: 10)
                    .padding(.top, 7)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(sender)
                            .font(.subheadline.weight(message.isUnread ? .semibold : .regular))
                            .lineLimit(1)
                        Spacer(minLength: 12)
                        if let received = MailDateFormatter.displayText(message.receivedAt) {
                            Text(received)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Text(message.subject)
                        .font(.headline)
                        .lineLimit(2)

                    if let notice = message.universityApprovalNotice {
                        MailUniversityApprovalBadge(notice: notice)
                    }

                    if let preview = message.preview?.trimmedOrNil {
                        Text(preview)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
        }
    }

    private var sender: String {
        message.fromName?.trimmedOrNil ?? message.fromAddress?.trimmedOrNil ?? "Unknown sender"
    }
}
