import SwiftUI

struct StudyAssistantChatBubble: View {
    let message: StudyAssistantMessage
    var pendingText = "Thinking locally."

    var body: some View {
        HStack {
            if message.role == .assistant {
                bubble
                Spacer(minLength: 36)
            } else {
                Spacer(minLength: 36)
                bubble
            }
        }
    }

    private var bubble: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(roleLabel)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            if message.text.isEmpty && message.isPending {
                AppInlineStatusLine(text: pendingText, tint: .accentColor, isLoading: true)
            } else {
                Text(message.text)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .textSelection(.enabled)
            }

            if !message.toolNames.isEmpty {
                StudyAssistantToolTags(toolNames: message.toolNames)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(backgroundStyle, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var roleLabel: String {
        switch message.role {
        case .assistant:
            "Assistant"
        case .user:
            "You"
        }
    }

    private var backgroundStyle: some ShapeStyle {
        switch message.role {
        case .assistant:
            Color(uiColor: .systemBackground)
        case .user:
            Color.accentColor.opacity(0.14)
        }
    }
}

private struct StudyAssistantToolTags: View {
    let toolNames: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tools used")
                .font(.caption)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(toolNames, id: \.self) { toolName in
                    Text(toolName)
                        .font(.caption.monospaced())
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color(uiColor: .secondarySystemBackground), in: Capsule())
                }
            }
        }
    }
}
