#if canImport(FoundationModels)
import SwiftUI

@available(iOS 26.0, *)
struct StudyAssistantView: View {
    @State private var viewModel: StudyAssistantViewModel
    @FocusState private var isComposerFocused: Bool

    init(configuration: StudyAssistantConfiguration) {
        _viewModel = State(initialValue: StudyAssistantViewModel(configuration: configuration))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    headerCard

                    if messagesShouldShowSuggestions {
                        suggestionRow
                    }

                    ForEach(viewModel.messages) { message in
                        StudyAssistantBubble(message: message)
                            .id(message.id)
                    }
                }
                .padding(16)
                .padding(.bottom, 140)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .safeAreaInset(edge: .bottom) {
                composer
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Clear") {
                        viewModel.resetConversation()
                    }
                    .disabled(viewModel.isSending)
                }
            }
            .task {
                viewModel.prepare()
            }
            .onChange(of: viewModel.messages) {
                guard let id = viewModel.messages.last?.id else { return }
                withAnimation(.snappy(duration: 0.24)) {
                    proxy.scrollTo(id, anchor: .bottom)
                }
            }
        }
    }

    private var headerCard: some View {
        AppSurfaceCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("On-device assistant test")
                    .font(.system(.title2, design: .rounded, weight: .bold))

                Text("The model runs on device. Live university data comes from a small Swift tool set wired to Alma, ILIAS, Moodle, and the public talks feed.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if !viewModel.configuration.hasCredentials {
                AppInlineStatusLine(
                    text: "Credentials are missing. Questions about grades, tasks, deadlines, or lectures will fail until you save them in Settings.",
                    systemImage: "lock.slash",
                    tint: .orange
                )
            }

            if let availabilityMessage = viewModel.availabilityMessage {
                AppInlineStatusLine(
                    text: availabilityMessage,
                    systemImage: "exclamationmark.triangle",
                    tint: .orange
                )
            } else if let statusMessage = viewModel.statusMessage {
                AppInlineStatusLine(
                    text: statusMessage,
                    tint: .accentColor,
                    isLoading: viewModel.isSending
                )
            }
        }
    }

    private var messagesShouldShowSuggestions: Bool {
        viewModel.messages.count <= 1
    }

    private var suggestionRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Self.suggestedPrompts, id: \.self) { prompt in
                    Button(prompt) {
                        isComposerFocused = false
                        Task {
                            await viewModel.sendSuggestedPrompt(prompt)
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(uiColor: .secondarySystemBackground), in: Capsule())
                }
            }
        }
    }

    private var composer: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(alignment: .bottom, spacing: 12) {
                TextField(
                    "Ask about grades, due work, courses, or talks",
                    text: $viewModel.draft,
                    axis: .vertical
                )
                .textInputAutocapitalization(.sentences)
                .autocorrectionDisabled()
                .focused($isComposerFocused)
                .lineLimit(1...5)
                .submitLabel(.send)
                .onSubmit {
                    guard viewModel.canSend else { return }
                    isComposerFocused = false
                    Task {
                        await viewModel.sendCurrentDraft()
                    }
                }

                Button {
                    isComposerFocused = false
                    Task {
                        await viewModel.sendCurrentDraft()
                    }
                } label: {
                    Image(systemName: viewModel.isSending ? "hourglass" : "arrow.up.circle.fill")
                        .font(.system(size: 28))
                }
                .buttonStyle(.plain)
                .disabled(!viewModel.canSend)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(.ultraThinMaterial)
        }
    }

    private static let suggestedPrompts = [
        "What is currently due for me?",
        "Summarize my current grades.",
        "Find machine learning courses.",
        "Any upcoming AI talks?"
    ]
}

@available(iOS 26.0, *)
private struct StudyAssistantBubble: View {
    let message: StudyAssistantMessage

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
                AppInlineStatusLine(text: "Thinking on device.", tint: .accentColor, isLoading: true)
            } else {
                Text(message.text)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .textSelection(.enabled)
            }

            if !message.toolNames.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Tools used")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    FlexibleToolTagList(toolNames: message.toolNames)
                }
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

@available(iOS 26.0, *)
private struct FlexibleToolTagList: View {
    let toolNames: [String]

    var body: some View {
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
#endif
