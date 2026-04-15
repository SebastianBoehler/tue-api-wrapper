import SwiftUI

struct MailMessageRow: View {
    var message: MailMessageSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
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

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                if message.isUnread {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(.blue)
                        .accessibilityLabel("Unread")
                }
                Text(message.subject)
                    .font(.headline)
                    .lineLimit(2)
            }

            if let preview = message.preview, !preview.isEmpty {
                Text(preview)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }

    private var sender: String {
        message.fromName?.trimmedOrNil ?? message.fromAddress?.trimmedOrNil ?? "Unknown sender"
    }
}
